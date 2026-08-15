import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/src/lib/auth'

export default async function DashboardPage() {
  const session = await getServerSession(authConfig) as any
  
  if (!session?.user) {
    redirect('/login')
  }

  // session.user.role is the *effective* role (OWNER while impersonating —
  // see auth.ts's session callback), so this only fires for a genuine,
  // non-impersonating platform operator with no org context of their own.
  if (session.user.role === 'SUPER_DEVELOPER') {
    redirect('/dashboard/platform')
  }

  if (session.user.role === 'ADMIN' || session.user.role === 'OWNER') {
    redirect('/dashboard/admin')
  }

  redirect('/dashboard/agent')
}
