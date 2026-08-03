import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/src/lib/auth'

export default async function DashboardPage() {
  const session = await getServerSession(authConfig) as any
  
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role === 'ADMIN' || session.user.role === 'OWNER') {
    redirect('/dashboard/admin')
  }

  redirect('/dashboard/agent')
}
