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

        const identifier = (credentials.email as string).trim()

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: identifier } },
              { name: { equals: identifier } },
            ]
          }
        })

        if (!user || !user.isActive) return null

        const isValid = await compare(credentials.password as string, user.password)
        if (!isValid) return null

        await logActivity(user.id, 'LOGIN', `Signed in as ${user.role}`)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    }
  },
  session: {
    strategy: 'jwt'
  }
}
