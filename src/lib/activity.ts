import { prisma } from './prisma'

export async function logActivity(userId: string, action: string, details?: string) {
  try {
    await prisma.activityLog.create({ data: { userId, action, details } })
  } catch {
    // never let activity logging break the calling request
  }
}
