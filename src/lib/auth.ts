import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'
import { logActivity } from './activity'

export const authConfig: any = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Email only — name was never unique even single-tenant, and
        // multi-tenant it's a real cross-org auth risk if two orgs happen to
        // have identically-named staff.
        const identifier = (credentials.email as string).trim()

        const user = await prisma.user.findUnique({ where: { email: identifier } })

        if (!user || !user.isActive) return null

        const isValid = await compare(credentials.password as string, user.password)
        if (!isValid) return null

        await logActivity(user.id, 'LOGIN', `Signed in as ${user.role}`)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: { token: any; user: any; trigger?: string; session?: any }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.organizationId = user.organizationId ?? null
      }
      // How SUPER_DEVELOPER impersonation mutates an already-issued session:
      // the client calls next-auth's session.update({ impersonatingOrgId })
      // (or `{ impersonatingOrgId: null }` to exit) without forcing a re-login.
      if (trigger === 'update' && session && 'impersonatingOrgId' in session) {
        token.impersonatingOrgId = session.impersonatingOrgId
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        const actualRole = token.role as string
        const impersonatingOrgId = (token.impersonatingOrgId as string | null) ?? null
        const baseOrgId = (token.organizationId as string | null) ?? null
        // While impersonating, expose the effective role ('OWNER') and the
        // active org (the impersonated one) so every existing client-side
        // `role !== 'OWNER'` gate and any org-id read across the app keeps
        // working unmodified — mirrors getEffectiveUser's server-side
        // semantics exactly. actualRole is there for the rare cases (the
        // impersonation banner itself) that need to know the user is really
        // a SUPER_DEVELOPER.
        session.user.role = impersonatingOrgId ? 'OWNER' : actualRole
        session.user.actualRole = actualRole
        session.user.id = token.id as string
        session.user.organizationId = impersonatingOrgId ?? baseOrgId
        session.user.impersonatingOrgId = impersonatingOrgId
      }
      return session
    }
  },
  session: {
    strategy: 'jwt'
  }
}
