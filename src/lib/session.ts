import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'

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
