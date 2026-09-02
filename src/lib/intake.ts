import { prisma } from '@/src/lib/prisma'
import { parseFeatures } from '@/src/lib/features'

// Resolves a public student-intake code to the staff member (and their active
// organization) it belongs to. Returns null for an unknown code, a user with
// no organization, a suspended organization, or an organization whose package
// doesn't include the Application Link — the caller should 404 in every one of
// those cases so a stale/guessed/unlicensed code can't be distinguished from a
// deliberately deactivated one. Gating here rather than in each route covers
// both the form-load GET and the submission POST from one place.
export async function resolveIntakeUser(code: string): Promise<{ id: string; name: string; organizationId: string; organizationName: string } | null> {
  const user = await prisma.user.findUnique({
    where: { studentIntakeCode: code },
    include: { organization: { select: { id: true, name: true, status: true, package: { select: { features: true } } } } },
  })
  if (!user || !user.organization || user.organization.status !== 'ACTIVE') return null

  const pkg = user.organization.package
  if (pkg && !parseFeatures(pkg.features).includes('intake_link')) return null

  return { id: user.id, name: user.name, organizationId: user.organization.id, organizationName: user.organization.name }
}
