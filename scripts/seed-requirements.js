const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Seed default document requirements
  const defaults = [
    { key: 'SELF_INTRO_VIDEO', label: 'Video of Self-introduction', description: 'The uploaded file type needs to be *.mp4, *.rmvb, *.avi, *.mov, *.mkv, *.wmv. Maximum video size 50M.', accept: 'video/*', type: 'VIDEO', maxSize: '50MB', isRequired: false, sortOrder: 0 },
    { key: 'PASSPORT_VISA', label: 'Valid Passport and Current Visa', description: 'Upload passport info page and current visa page', accept: '.pdf,image/*', type: 'PDF', maxSize: '10MB', isRequired: true, sortOrder: 1 },
    { key: 'HIGHEST_DIPLOMA', label: 'Highest Academic Certificate', description: 'Graduation certificate or pre-graduation certificate with the official seal from current school', accept: '.pdf,image/*', type: 'PDF', maxSize: '10MB', isRequired: true, sortOrder: 2 },
    { key: 'TRANSCRIPTS', label: 'Transcripts of the Highest Academic Degree', description: 'Transcripts for the whole study period, better with GPA grading system instruction', accept: '.pdf,image/*', type: 'PDF', maxSize: '10MB', isRequired: true, sortOrder: 3 },
    { key: 'ENGLISH_CERT', label: 'English Proficiency Certificate', description: 'IELTS, TOEFL, or other English proficiency certificates', accept: '.pdf,image/*', type: 'PDF', maxSize: '10MB', isRequired: true, sortOrder: 4 },
    { key: 'PHYSICAL_EXAM', label: 'Foreigner Physical Examination Form', description: 'Completed physical examination form', accept: '.pdf,image/*', type: 'PDF', maxSize: '10MB', isRequired: true, sortOrder: 5 },
    { key: 'NON_CRIMINAL', label: 'Non-criminal Record', description: 'Non-criminal commitment, get in recent 6 months', accept: '.pdf,image/*', type: 'PDF', maxSize: '10MB', isRequired: true, sortOrder: 6 },
    { key: 'FINANCIAL_SUPPORT', label: 'Financial Support Statement', description: 'Bank statement or financial guarantee letter', accept: '.pdf,image/*', type: 'PDF', maxSize: '10MB', isRequired: true, sortOrder: 7 },
    { key: 'TRANSFER_NOC', label: 'Transfer Letter / NOC Letter', description: 'Only for students currently in China', accept: '.pdf,image/*', type: 'PDF', maxSize: '10MB', isRequired: false, sortOrder: 8 },
    { key: 'ATTORNEY', label: 'Certificate of Attorney', description: 'Applicants under 18 need to download and fill in this document', accept: '.pdf,image/*', type: 'PDF', maxSize: '10MB', isRequired: false, sortOrder: 9 },
    { key: 'CSCA', label: 'CSCA Examination Score Report', description: 'CSCA test score report if applicable', accept: '.pdf,image/*', type: 'PDF', maxSize: '10MB', isRequired: false, sortOrder: 10 },
    { key: 'OTHER', label: 'Other Documents', description: 'Any other supporting documents', accept: '.pdf,image/*,video/*', type: 'PDF', maxSize: '50MB', isRequired: false, sortOrder: 11 },
  ]

  for (const d of defaults) {
    await prisma.documentRequirement.upsert({
      where: { key: d.key },
      update: d,
      create: d,
    })
  }
  console.log('Seeded document requirements')

  // Create owner user if not exists
  const owner = await prisma.user.findUnique({ where: { email: 'owner@glorie.com' } })
  if (!owner) {
    const bcrypt = require('bcryptjs')
    const hash = await bcrypt.hash('owner123', 12)
    await prisma.user.create({
      data: {
        name: 'Owner',
        email: 'owner@glorie.com',
        password: hash,
        role: 'OWNER',
        isActive: true,
      }
    })
    console.log('Created owner user: owner@glorie.com / owner123')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
