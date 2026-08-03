import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/src/lib/auth'
import { prisma } from '@/src/lib/prisma'
import AgentDashboard from './AgentDashboard'

export default async function AgentPage() {
  const session = await getServerSession(authConfig) as any
  
  if (!session?.user || session.user.role !== 'AGENT') {
    redirect('/login')
  }

  const [studentsCount, pendingCount, approvedCount, recentStudents] = await Promise.all([
    prisma.student.count({ where: { agentId: session.user.id } }),
    prisma.student.count({ where: { agentId: session.user.id, status: 'PENDING' } }),
    prisma.student.count({ where: { agentId: session.user.id, status: 'APPROVED' } }),
    prisma.student.findMany({
      where: { agentId: session.user.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { documents: true }
    })
  ])

  return (
    <AgentDashboard
      stats={{
        students: studentsCount,
        pending: pendingCount,
        approved: approvedCount
      }}
      recentStudents={recentStudents}
    />
  )
}
