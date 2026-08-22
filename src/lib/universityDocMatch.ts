import { prisma } from '@/src/lib/prisma'

// Filenames for these documents already carry the student's identity in
// practice (e.g. "SHILA SADIA AKTER_Heze University_JW202.pdf") — reading
// that is instant and far more reliable than OCR'ing the file content, so
// this is the only detection source. Passport number is checked first
// (rarer in a filename, but an exact hit is trusted outright); name only
// counts on an exact, non-fuzzy match. Either way the caller still needs a
// human click to accept it — this only ever returns a suggestion.
function stripSpace(s: string) {
  return s.toLowerCase().replace(/[\s_\-.]+/g, '')
}

function words(s: string) {
  return s.toLowerCase().split(/[\s_\-.]+/).filter(Boolean)
}

// Word-sequence containment, not raw substring — "Ali" must appear as its
// own token, not as a fragment inside "Australia" or "California".
function containsWordSequence(haystack: string[], needle: string[]) {
  if (needle.length === 0) return false
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (needle.every((w, j) => haystack[i + j] === w)) return true
  }
  return false
}

export async function matchByFilename(filename: string, organizationId: string) {
  const compact = stripSpace(filename)
  const fileWords = words(filename)
  if (fileWords.length === 0) return null

  const students = await prisma.student.findMany({
    where: { organizationId },
    select: { id: true, fullName: true, passportNo: true },
  })

  const passportHits = students.filter(s => {
    const p = stripSpace(s.passportNo || '')
    return p.length >= 5 && compact.includes(p)
  })
  if (passportHits.length === 1) {
    return { studentId: passportHits[0].id, reason: 'passport' as const }
  }
  if (passportHits.length > 1) return null // ambiguous — abstain rather than guess

  const nameHits = students.filter(s => {
    const nameWords = words(s.fullName || '')
    if (nameWords.length === 0 || nameWords.join('').length < 3) return false
    return containsWordSequence(fileWords, nameWords)
  })
  if (nameHits.length === 1) {
    return { studentId: nameHits[0].id, reason: 'name' as const }
  }
  return null // zero or ambiguous — abstain
}
