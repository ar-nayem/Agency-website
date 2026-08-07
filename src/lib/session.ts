import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

const secret = process.env.NEXTAUTH_SECRET || 'glorie-secret-key-2024-change-in-production'

export async function getSessionUser(req: NextRequest) {
  const token = await getToken({ req, secret })
  if (!token) return null
  return {
    id: token.sub as string,
    email: token.email as string,
    name: token.name as string,
    role: token.role as string,
  }
}

export function isAdminRole(role: string | undefined) {
  return role === 'ADMIN' || role === 'OWNER'
}

// University Portals visibility for admins is a per-account grant the owner
// toggles at any time — the JWT only carries role (set at login), so this
// needs a live DB read rather than trusting a stale token claim.
export async function canAccessPortals(user: { id: string; role: string } | null): Promise<boolean> {
  if (!user) return false
  if (user.role === 'OWNER') return true
  if (user.role !== 'ADMIN') return false
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { canViewPortals: true } })
  return !!dbUser?.canViewPortals
}
