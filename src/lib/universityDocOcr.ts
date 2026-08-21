import { readFile } from 'fs/promises'
import { join } from 'path'
import { createWorker } from 'tesseract.js'
import { PDFParse } from 'pdf-parse'
import { prisma } from '@/src/lib/prisma'

// In-process job queue — this app runs pm2 in fork mode (one process, no
// cluster), so a plain in-memory array is a safe, dependency-free stand-in
// for a real queue. Capped concurrency keeps a big batch upload from
// spinning up dozens of tesseract workers at once and starving the other
// apps sharing this small VPS.
const MAX_CONCURRENT = 2
let active = 0
const queue: string[] = []

export function enqueueOcr(documentId: string) {
  queue.push(documentId)
  pump()
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const id = queue.shift() as string
    active++
    processDocument(id)
      .catch(err => console.error('University doc OCR failed:', id, err))
      .finally(() => {
        active--
        pump()
      })
  }
}

// Some scanners/PDF tools stamp trivial placeholder text ("-- 1 of 6 --" page
// markers and the like) into an otherwise-scanned PDF, which easily clears a
// low bar without containing anything useful. Real letters/forms run well
// past this even for a short one-pager, so the bar is set high enough to
// force those placeholder-only PDFs into the OCR fallback instead.
const MIN_TEXT_LENGTH = 150

async function extractText(filePath: string, mimeType: string): Promise<string> {
  if (mimeType.startsWith('image/')) {
    const worker = await createWorker('eng')
    try {
      const buffer = await readFile(filePath)
      const { data } = await worker.recognize(buffer)
      return data.text || ''
    } finally {
      await worker.terminate()
    }
  }

  if (mimeType === 'application/pdf') {
    const buffer = await readFile(filePath)
    const parser = new PDFParse({ data: buffer })
    try {
      const textResult = await parser.getText()
      const text = textResult.text || ''
      if (text.trim().length >= MIN_TEXT_LENGTH) return text

      // No real text layer — likely a scanned PDF. Rasterize the first
      // couple pages and OCR those instead.
      const shot = await parser.getScreenshot({ first: 2, scale: 2 })
      const worker = await createWorker('eng')
      try {
        let combined = ''
        for (const page of shot.pages) {
          const { data } = await worker.recognize(page.data as Buffer)
          combined += '\n' + (data.text || '')
        }
        return combined
      } finally {
        await worker.terminate()
      }
    } finally {
      await parser.destroy()
    }
  }

  return ''
}

function collapseSpace(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

function stripSpace(s: string) {
  return s.toLowerCase().replace(/\s+/g, '')
}

async function findMatch(text: string, organizationId: string) {
  const spaced = collapseSpace(text)
  const compact = stripSpace(text)
  if (!spaced) return null

  const students = await prisma.student.findMany({
    where: { organizationId },
    select: { id: true, fullName: true, passportNo: true },
  })

  // Passport number first — an exact alphanumeric hit is far more reliable
  // than matching a name out of noisy OCR text.
  const passportHits = students.filter(s => {
    const p = stripSpace(s.passportNo || '')
    return p.length >= 5 && compact.includes(p)
  })
  if (passportHits.length === 1) {
    return { studentId: passportHits[0].id, reason: 'passport' as const }
  }
  if (passportHits.length > 1) return null // ambiguous — abstain rather than guess

  // Fall back to an exact (not fuzzy) full-name match.
  const nameHits = students.filter(s => {
    const n = collapseSpace(s.fullName || '')
    return n.length >= 3 && spaced.includes(n)
  })
  if (nameHits.length === 1) {
    return { studentId: nameHits[0].id, reason: 'name' as const }
  }
  return null // zero or ambiguous — abstain
}

async function processDocument(documentId: string) {
  const doc = await prisma.universityDocument.findUnique({ where: { id: documentId } })
  if (!doc || !doc.organizationId) return

  const filePath = join(process.cwd(), 'public', 'uploads', 'universities', doc.filename)

  let text = ''
  try {
    text = await extractText(filePath, doc.mimeType)
  } catch (err) {
    console.error('University doc text extraction failed:', documentId, err)
    await prisma.universityDocument.update({ where: { id: documentId }, data: { ocrStatus: 'FAILED' } })
    return
  }

  if (!text.trim()) {
    await prisma.universityDocument.update({ where: { id: documentId }, data: { ocrStatus: 'UNSUPPORTED' } })
    return
  }

  const match = await findMatch(text, doc.organizationId)
  if (match) {
    await prisma.universityDocument.update({
      where: { id: documentId },
      data: { ocrStatus: 'SUGGESTED', suggestedStudentId: match.studentId, suggestedMatchReason: match.reason },
    })
  } else {
    await prisma.universityDocument.update({ where: { id: documentId }, data: { ocrStatus: 'NO_MATCH' } })
  }
}
