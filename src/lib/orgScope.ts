import { SUPER_DEVELOPER } from '@/src/lib/roles'

// Every helper below only ever needs role + organizationId — accepting this
// minimal shape (rather than the full EffectiveUser) lets callers pass
// partial/local user types (e.g. chatbot.ts's SessionUser) without friction.
type ScopedUser = { role: string; organizationId: string | null }

export function isSuperDeveloper(role: string) {
  return role === SUPER_DEVELOPER
}

// A real organizationId can never equal this — used so an unscoped user
// (a SUPER_DEVELOPER not impersonating anyone) forced through a scoped query
// path matches zero rows instead of accidentally matching legitimate NULLs.
const NO_MATCH = '__no_org__'

// Filter for org-scoped models with a direct organizationId column.
// SUPER_DEVELOPER with no active org (not impersonating) gets {} — intentionally
// unscoped, sees every org. Everyone else is locked to their own organizationId.
export function orgWhere(user: ScopedUser): { organizationId?: string } {
  if (isSuperDeveloper(user.role) && !user.organizationId) return {}
  return { organizationId: user.organizationId ?? NO_MATCH }
}

// Same, but for models only reachable via a parent relation, e.g.
// orgWhereVia(user, 'portal') -> { portal: { organizationId: ... } }
export function orgWhereVia(user: ScopedUser, relation: string): Record<string, any> {
  if (isSuperDeveloper(user.role) && !user.organizationId) return {}
  return { [relation]: { organizationId: user.organizationId ?? NO_MATCH } }
}

// The org id to stamp on a new row. Null means the caller has no active org
// context (an un-impersonating SUPER_DEVELOPER) — the route must reject the
// write itself; this never silently invents an org.
export function requireOrgId(user: ScopedUser): string | null {
  return user.organizationId ?? null
}

// Does this record belong to the user's active org? Use for id-based lookups
// (GET/PATCH/DELETE by id) — on false, the route should 404 (never 403), so
// an outsider can't distinguish "wrong org" from "doesn't exist."
export function isSameOrg(user: ScopedUser, record: { organizationId: string | null } | null | undefined): boolean {
  if (!record) return false
  if (isSuperDeveloper(user.role) && !user.organizationId) return true
  return !!user.organizationId && record.organizationId === user.organizationId
}
