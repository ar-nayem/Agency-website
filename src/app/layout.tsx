import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { prisma } from '@/src/lib/prisma'

const inter = Inter({ subsets: ['latin'] })

// The title pulls the org name from the DB, which the owner can edit at any time —
// force dynamic rendering so a name change shows up without needing a rebuild.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  let orgName = 'Chengdu Dream Fly Edu'
  try {
    const ownerOrg = await prisma.organizationProfile.findFirst({ where: { user: { role: 'OWNER' } } })
    if (ownerOrg?.name) orgName = ownerOrg.name
  } catch {
    // fall back to default name if the DB isn't reachable
  }
  return {
    title: `${orgName} Student Portal`,
    description: 'Student application and document management system',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);var t=m?decodeURIComponent(m[1]):null;if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
