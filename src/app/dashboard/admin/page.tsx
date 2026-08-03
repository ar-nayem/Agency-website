import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/src/lib/auth'
import { prisma } from '@/src/lib/prisma'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
  const session = await getServerSession(authConfig) as any
  
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
    redirect('/login')
  }

  const [agentsCount, studentsCount, pendingCount, recentStudents] = await Promise.all([
    prisma.user.count({ where: { role: 'AGENT' } }),
    prisma.student.count(),
    prisma.student.count({ where: { status: 'PENDING' } }),
    prisma.student.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { name: true } },
        documents: true
      }
    })
  ])

  const approvedCount = await prisma.student.count({ where: { status: 'APPROVED' } })
  const rejectedCount = await prisma.student.count({ where: { status: 'REJECTED' } })

  return (
    <AdminDashboard
      stats={{
        agents: agentsCount,
        students: studentsCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      }}
      recentStudents={recentStudents}
    />
  )
}
