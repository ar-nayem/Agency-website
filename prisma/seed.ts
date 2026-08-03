import { prisma } from '@/src/lib/prisma'
import { hash } from 'bcryptjs'

async function seed() {
  const adminExists = await prisma.user.findUnique({
    where: { email: 'admin@glorie.com' }
  })

  if (!adminExists) {
    await prisma.user.create({
      data: {
        name: 'System Admin',
        email: 'admin@glorie.com',
        password: await hash('admin123', 12),
        role: 'ADMIN',
        isActive: true
      }
    })
    console.log('Admin user created')
  }

  const agentExists = await prisma.user.findUnique({
    where: { email: 'agent@glorie.com' }
  })

  if (!agentExists) {
    await prisma.user.create({
      data: {
        name: 'Demo Agent',
        email: 'agent@glorie.com',
        password: await hash('agent123', 12),
        role: 'AGENT',
        isActive: true
      }
    })
    console.log('Agent user created')
  }

  console.log('Seed completed')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
