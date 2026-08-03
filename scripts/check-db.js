const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@glorie.com' } })
  console.log('Admin exists:', admin ? 'YES - ' + admin.role + ' active=' + admin.isActive : 'NO')
  
  const agent = await prisma.user.findUnique({ where: { email: 'agent@glorie.com' } })
  console.log('Agent exists:', agent ? 'YES - ' + agent.role + ' active=' + agent.isActive : 'NO')
  
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 12)
    await prisma.user.create({
      data: { name: 'Admin', email: 'admin@glorie.com', password: hash, role: 'ADMIN', isActive: true }
    })
    console.log('Created admin user')
  }
  
  if (!agent) {
    const hash = await bcrypt.hash('agent123', 12)
    await prisma.user.create({
      data: { name: 'Agent Demo', email: 'agent@glorie.com', password: hash, role: 'AGENT', isActive: true }
    })
    console.log('Created agent user')
  }
  
  const studentCount = await prisma.student.count()
  console.log('Students in DB:', studentCount)
}

main().catch(console.error).finally(() => prisma.$disconnect())
