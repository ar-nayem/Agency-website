import { prisma } from '@/src/lib/prisma'

// Resolves a public student-intake code to the staff member (and their active
// organization) it belongs to. Returns null for an unknown code, a user with
// no organization, or a suspended organization — the caller should 404 in
// every one of those cases so a stale/guessed code can't be distinguished
// from a deliberately deactivated one.
export async function resolveIntakeUser(code: string): Promise<{ id: string; name: string; organizationId: string; organizationName: string } | null> {
  const user = await prisma.user.findUnique({
    where: { studentIntakeCode: code },
    include: { organization: { select: { id: true, name: true, status: true } } },
  })
  if (!user || !user.organization || user.organization.status !== 'ACTIVE') return null

  return { id: user.id, name: user.name, organizationId: user.organization.id, organizationName: user.organization.name }
}
