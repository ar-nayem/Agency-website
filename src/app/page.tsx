import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/src/lib/prisma'
import { FEATURES, parseFeatures } from '@/src/lib/features'
import {
  GraduationCap, Users, Wallet, Globe, FileText, ListTodo, ShieldCheck,
  BarChart3, MessageSquare, Check, ArrowRight, Building2,
} from 'lucide-react'
import { TRIAL_DAYS } from '@/src/lib/trial'

export const metadata: Metadata = {
  title: 'Student Portal — Run your study-abroad agency in one place',
  description:
    'Applications, documents, finance and university portals for study-abroad agencies. Start a free trial, no card required.',
}

// Pricing comes from the same Package rows the super developer already edits,
// so the public page can never drift from what's actually sold. Rendered on
// the server per request rather than fetched client-side: it's the page's
// primary content, and it should be in the HTML for anyone linking to it.
export const dynamic = 'force-dynamic'

const CYCLE_LABEL: Record<string, string> = {
  MONTHLY: '/month',
  QUARTERLY: '/quarter',
  YEARLY: '/year',
  ONE_TIME: ' one-time',
}

const CURRENCY_SYMBOL: Record<string, string> = { CNY: '¥', USD: '$', BDT: '৳', EUR: '€', GBP: '£' }

const CAPABILITIES = [
  { icon: Users, title: 'Every applicant in one record', body: 'Personal details, education history, work experience, family and sponsors — the full application, not scattered across spreadsheets.' },
  { icon: FileText, title: 'Documents that chase themselves', body: 'Set what each student must upload, then let them fill it in through their own link. You see what is missing at a glance.' },
  { icon: Globe, title: 'University portals, scanned for you', body: 'Connect the university application portals you already use. Status changes come to you by email instead of you logging in to check.' },
  { icon: Wallet, title: 'Money tracked per student', body: 'Income and expenses against each applicant, receipts, and an export whenever your accountant asks.' },
  { icon: ListTodo, title: 'Nothing slips', body: 'Assign work to your team with deadlines, and get reminded before something is late.' },
  { icon: ShieldCheck, title: 'Your team, your permissions', body: 'Owners, admins and agents each see exactly what they should. Sensitive documents stay restricted.' },
  { icon: BarChart3, title: 'See your own traffic', body: 'Visitor analytics scoped strictly to your organisation — your agents, your admins, your students. Never anyone else’s.' },
  { icon: MessageSquare, title: 'Talk where the work is', body: 'Internal messaging tied to the student being discussed, so context never gets lost in a chat app.' },
]

export default async function LandingPage() {
  const packages = await prisma.package
    .findMany({
      where: { isPublic: true },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
      select: {
        id: true, name: true, description: true, price: true, currency: true,
        billingCycle: true, studentLimit: true, features: true,
      },
    })
    .catch(() => [])

  const labelFor = new Map(FEATURES.map((f) => [f.key, f.label]))

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold tracking-tight truncate">Student Portal</span>
          </div>
          <nav className="flex items-center gap-1.5 sm:gap-3 text-sm">
            <a href="#features" className="hidden sm:inline px-3 py-2 text-muted-foreground hover:text-foreground transition">Features</a>
            <a href="#pricing" className="hidden sm:inline px-3 py-2 text-muted-foreground hover:text-foreground transition">Pricing</a>
            <Link href="/login" className="px-3 py-2 text-muted-foreground hover:text-foreground transition">Sign in</Link>
            <Link
              href="/signup"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow-sm shadow-indigo-500/20"
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(99,102,241,0.18),transparent)]" />
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-14 sm:pt-24 sm:pb-20 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            {TRIAL_DAYS}-day free trial · no card required
          </span>
          <h1 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
            Run your study-abroad<br className="hidden sm:block" /> agency in one place
          </h1>
          <p className="mt-5 mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Applications, documents, university portals, finance and your whole team — in a single
            system built for education agencies, not bent out of a generic CRM.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition inline-flex items-center gap-2 shadow-sm shadow-indigo-500/25"
            >
              Start your {TRIAL_DAYS}-day trial <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="px-5 py-3 rounded-xl border border-border font-semibold hover:bg-muted transition">
              See what it does
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Set up in a couple of minutes. Everything you add during the trial stays if you continue.
          </p>
        </div>
      </section>

      {/* Capabilities */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Everything an agency actually does</h2>
          <p className="mt-3 text-muted-foreground">
            Built alongside working agencies — each piece exists because someone was doing it by hand.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
                <c.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-semibold mb-1.5">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Separation guarantee */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 py-14 grid gap-8 md:grid-cols-[auto_1fr] items-start">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="max-w-3xl">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Your data is yours alone</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Every organisation on this platform is fully separated. Your students, documents,
              finances, staff accounts and analytics are scoped to your organisation and are never
              visible to another agency — and you can export the whole lot to your own computer
              whenever you want.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Simple pricing</h2>
          <p className="mt-3 text-muted-foreground">
            Start free for {TRIAL_DAYS} days. Pick a plan when you are ready — no lock-in.
          </p>
        </div>

        {packages.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border/60 bg-card p-8 text-center">
            <p className="font-semibold">Plans are being finalised</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Start your free trial now and we will talk pricing before it ends.
            </p>
            <Link
              href="/signup"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
            >
              Start free trial <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {packages.map((p, i) => {
              const featureLabels = parseFeatures(p.features).map((k) => labelFor.get(k)).filter(Boolean) as string[]
              const featured = i === 1
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border bg-card p-6 shadow-sm flex flex-col ${
                    featured ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-border/60'
                  }`}
                >
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  {p.description && <p className="mt-1.5 text-sm text-muted-foreground">{p.description}</p>}
                  <div className="mt-5">
                    {p.price === null ? (
                      <span className="text-2xl font-bold">Talk to us</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold tracking-tight">
                          {CURRENCY_SYMBOL[p.currency] || ''}{p.price}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {CYCLE_LABEL[p.billingCycle] || ''}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.studentLimit === null ? 'Unlimited students' : `Up to ${p.studentLimit} students`}
                  </p>
                  {featureLabels.length > 0 && (
                    <ul className="mt-5 space-y-2 flex-1">
                      {featureLabels.map((label) => (
                        <li key={label} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href="/signup"
                    className={`mt-6 px-4 py-2.5 rounded-xl font-semibold text-sm text-center transition ${
                      featured
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'border border-border hover:bg-muted'
                    }`}
                  >
                    Start free trial
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-14 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Try it with your real applicants</h2>
          <p className="mt-3 mx-auto max-w-xl text-indigo-100">
            {TRIAL_DAYS} days, full access, no card. If it does not fit how you work, walk away —
            and take your data with you.
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition"
          >
            Create your account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-8 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Student Portal</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground transition">Sign in</Link>
            <Link href="/signup" className="hover:text-foreground transition">Start free trial</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
