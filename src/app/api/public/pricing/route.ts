export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { FEATURES, parseFeatures } from '@/src/lib/features'
import { NextResponse } from 'next/server'

// Public — the marketing site's pricing table. Only packages the super
// developer marked public are exposed, and only their labels: feature keys,
// internal notes and org counts stay out of the response.
export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      where: { isPublic: true },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
      select: {
        id: true, name: true, description: true, price: true, currency: true,
        billingCycle: true, studentLimit: true, features: true, isTrialPlan: true,
      },
    })

    const labelFor = new Map(FEATURES.map((f) => [f.key, f.label]))

    return NextResponse.json(packages.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      billingCycle: p.billingCycle,
      studentLimit: p.studentLimit,
      isTrialPlan: p.isTrialPlan,
      features: parseFeatures(p.features).map((k) => labelFor.get(k)).filter(Boolean),
    })))
  } catch (error) {
    console.error('GET /api/public/pricing error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
