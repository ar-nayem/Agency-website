import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      actualRole: string
      organizationId: string | null
      impersonatingOrgId: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: string
    organizationId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    id?: string
    organizationId?: string | null
    impersonatingOrgId?: string | null
  }
}
