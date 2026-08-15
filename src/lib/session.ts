import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { SUPER_DEVELOPER } from './roles'

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

export interface EffectiveUser {
  id: string
  email: string
  name: string
  /** The role to authorize against. While impersonating, this reads 'OWNER'
   *  so every existing role check keeps working unmodified — see actualRole. */
  role: string
  /** The real, un-impersonated role — use this for audit logging only. */
  actualRole: string
  /** Active org context: the impersonated org while impersonating, else the
   *  user's own org. Null only for a SUPER_DEVELOPER not impersonating anyone. */
  organizationId: string | null
  isImpersonating: boolean
}

// Like getSessionUser, but also resolves the active organization context
// (including SUPER_DEVELOPER impersonation) and enforces org suspension —
// a suspended org's users get treated as logged-out the moment they hit any
// route using this helper. Use this for every org-scoped route; getSessionUser
// stays available for routes that only need role, no org awareness.
export async function getEffectiveUser(req: NextRequest): Promise<EffectiveUser | null> {
  const token = await getToken({ req, secret })
  if (!token) return null

  const actualRole = token.role as string
  const baseOrgId = (token.organizationId as string | null | undefined) ?? null
  const impersonatingOrgId = (token.impersonatingOrgId as string | null | undefined) ?? null
  const activeOrgId = impersonatingOrgId ?? baseOrgId

  if (activeOrgId) {
    const org = await prisma.organization.findUnique({ where: { id: activeOrgId }, select: { status: true } })
    if (!org || org.status === 'SUSPENDED') {
      if (actualRole !== SUPER_DEVELOPER) return null
    }
  }

  return {
    id: token.sub as string,
    email: token.email as string,
    name: token.name as string,
    role: impersonatingOrgId ? 'OWNER' : actualRole,
    actualRole,
    organizationId: activeOrgId,
    isImpersonating: !!impersonatingOrgId,
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
