import { prisma } from '@/src/lib/prisma'

async function main() {
  const missing = await prisma.student.findMany({
    where: { serialNumber: null },
    orderBy: { createdAt: 'asc' },
  })

  if (missing.length === 0) {
    console.log('No students missing a serial number.')
    return
  }

  const lastStudent = await prisma.student.findFirst({
    where: { serialNumber: { not: null } },
    orderBy: { serialNumber: 'desc' },
  })
  let nextNum = 1
  if (lastStudent?.serialNumber) {
    const match = lastStudent.serialNumber.match(/(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  for (const student of missing) {
    const serialNumber = `GL-${String(nextNum).padStart(5, '0')}`
    await prisma.student.update({ where: { id: student.id }, data: { serialNumber } })
    console.log(`${student.fullName}: ${serialNumber}`)
    nextNum++
  }

  console.log(`Backfilled ${missing.length} student(s).`)
}

main().finally(() => prisma.$disconnect())
