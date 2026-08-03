export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const owner = searchParams.get('owner')

    if (owner === 'true') {
      const ownerUser = await prisma.user.findFirst({ where: { role: 'OWNER' } })
      if (!ownerUser) return NextResponse.json(null)
      const org = await prisma.organizationProfile.findUnique({
        where: { userId: ownerUser.id },
      })
      return NextResponse.json(org)
    }

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const org = await prisma.organizationProfile.findUnique({
      where: { userId },
    })

    return NextResponse.json(org)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, logo, email, phone, wechat, address, website, description, welcomeMessage } = body

    const org = await prisma.organizationProfile.upsert({
      where: { userId: user.id },
      update: { name, logo, email, phone, wechat, address, website, description, welcomeMessage },
      create: {
        name: name || user.name,
        logo, email, phone, wechat, address, website, description, welcomeMessage,
        userId: user.id,
      },
    })

    return NextResponse.json(org)
  } catch (error) {
    console.error('Organization PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}
