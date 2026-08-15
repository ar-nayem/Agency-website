export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { parseBrowser, parseOS, parseDeviceType } from '@/src/lib/uaParse'

function isOwner(role: string | undefined) {
  return role === 'OWNER'
}

// Pure UTC day-key math throughout — mixing local-time startOfDay with
// toISOString() (always UTC) silently shifts the date key whenever the
// server's local timezone isn't UTC, which broke the daily chart bucketing.
function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function utcDayStart(dateKey: string): Date {
  return new Date(dateKey + 'T00:00:00.000Z')
}

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isOwner(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const days = Math.min(Math.max(Number(searchParams.get('days')) || 30, 1), 90)
    const since = new Date(Date.now() - days * 24 * 3600 * 1000)

    const logs = await prisma.visitorLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    })

    const todayKey = utcDateKey(new Date())
    const today = utcDayStart(todayKey)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000)

    const totalVisits = logs.length
    const visitsToday = logs.filter((l) => l.createdAt >= today).length
    const visitsThisWeek = logs.filter((l) => l.createdAt >= weekAgo).length

    const uniqueUserIds = new Set(logs.filter((l) => l.userId).map((l) => l.userId))
    const uniqueAnonIps = new Set(logs.filter((l) => !l.userId && l.ip).map((l) => l.ip))
    const uniqueVisitors = uniqueUserIds.size + uniqueAnonIps.size

    const pathCounts = new Map<string, number>()
    for (const l of logs) pathCounts.set(l.path, (pathCounts.get(l.path) || 0) + 1)
    const topPages = Array.from(pathCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const dailyMap = new Map<string, number>()
    for (const l of logs) {
      const key = utcDateKey(l.createdAt)
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1)
    }
    const daily: { date: string; count: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const key = utcDateKey(new Date(today.getTime() - i * 24 * 3600 * 1000))
      daily.push({ date: key, count: dailyMap.get(key) || 0 })
    }

    const userMap = new Map<string, { userId: string; name: string; email: string; role: string; count: number; lastSeen: Date }>()
    for (const l of logs) {
      if (!l.userId) continue
      const existing = userMap.get(l.userId)
      if (existing) {
        existing.count++
        if (l.createdAt > existing.lastSeen) existing.lastSeen = l.createdAt
      } else {
        userMap.set(l.userId, {
          userId: l.userId,
          name: l.userName || 'Unknown',
          email: l.userEmail || '',
          role: l.userRole || '',
          count: 1,
          lastSeen: l.createdAt,
        })
      }
    }
    const perUser = Array.from(userMap.values()).sort((a, b) => b.count - a.count)

    const browserCounts = new Map<string, number>()
    const osCounts = new Map<string, number>()
    const deviceCounts = new Map<string, number>()
    for (const l of logs) {
      const b = parseBrowser(l.userAgent)
      const o = parseOS(l.userAgent)
      const d = parseDeviceType(l.userAgent)
      browserCounts.set(b, (browserCounts.get(b) || 0) + 1)
      osCounts.set(o, (osCounts.get(o) || 0) + 1)
      deviceCounts.set(d, (deviceCounts.get(d) || 0) + 1)
    }

    const recent = logs.slice(0, 50).map((l) => ({
      id: l.id,
      userName: l.userName,
      userEmail: l.userEmail,
      userRole: l.userRole,
      path: l.path,
      ip: l.ip,
      browser: parseBrowser(l.userAgent),
      os: parseOS(l.userAgent),
      device: parseDeviceType(l.userAgent),
      createdAt: l.createdAt,
    }))

    return NextResponse.json({
      totalVisits,
      visitsToday,
      visitsThisWeek,
      uniqueVisitors,
      topPages,
      daily,
      perUser,
      browserCounts: Object.fromEntries(browserCounts),
      osCounts: Object.fromEntries(osCounts),
      deviceCounts: Object.fromEntries(deviceCounts),
      recent,
    })
  } catch (error) {
    console.error('GET /api/analytics/summary error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
