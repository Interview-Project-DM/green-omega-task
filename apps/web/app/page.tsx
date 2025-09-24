import {
  Activity,
  ArrowRight,
  Gauge,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";
import Link from "next/link";

import { Button } from "@workspace/ui/components/button";

const performanceStories = [
  { type: "Action", text: "Trimmed 15% of Meta spend last Tuesday." },
  {
    type: "Result",
    text: "Blended CAC fell 5% while weekly sales held steady.",
  },
  {
    type: "Action",
    text: "Shifted 8% of budget from Meta to Pinterest in minutes.",
  },
  {
    type: "Result",
    text: "Added 4% topline revenue, ROAS lifted to 3.1×.",
  },
  {
    type: "Action",
    text: "Ran a YouTube incrementality test across prospecting cohorts.",
  },
  {
    type: "Result",
    text: "Uncovered 11% incremental lift and raised net margin 5%.",
  },
]

const pressurePoints = [
  {
    title: "Customers cost more",
    description:
      "Auction competition, privacy rules, and saturated audiences push acquisition costs higher every quarter. Without smarter measurement, efficiency slowly erodes.",
  },
  {
    title: "Platforms grade their own homework",
    description:
      "Self-attributing dashboards pad conversions with murky windows and view-through math. You need an independent source of truth before reinvesting a dollar.",
  },
  {
    title: "Too many tools, not enough signal",
    description:
      "Teams burn weeks stitching CSVs, BI dashboards, and lift studies that never align. Decisions lag behind the markets where you spend.",
  },
  {
    title: "Higher targets, less cash",
    description:
      "Economic headwinds and tighter finance controls mean every campaign must earn its keep—fast. Leadership expects growth without ballooning media budgets.",
  },
]

const proofPoints = [
  { value: "14×", label: "Revenue for every $1 newly routed through GreenOmega" },
  { value: "21%", label: "Lower blended CAC while scaling top-line revenue" },
  { value: "5×", label: "Productivity gains across campaigns with the same headcount" },
]

const platformModules = [
  {
    title: "Incrementality autopilot",
    icon: Target,
    description:
      "Design geo-holdouts, PSA swaps, and marketplace experiments in one workflow. GreenOmega calculates lift in real time and nudges budgets toward the winner.",
  },
  {
    title: "Media mix intelligence",
    icon: LineChart,
    description:
      "Always-on MMM blended with short-term contribution models reveals where marginal dollars deliver outsized returns across funnel stages and regions.",
  },
  {
    title: "Creative signal lab",
    icon: Sparkles,
    description:
      "Parse performance by storyline, hook, and audience fit. Feed the highest converting insights straight into your creative pipeline with automated briefs.",
  },
  {
    title: "Finance-grade governance",
    icon: ShieldCheck,
    description:
      "Audit trails, scenario planning, and attribution that stands up in the boardroom. Every reallocation is documented with evidence stakeholders trust.",
  },
]

export default function Page() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-950/95 to-black text-emerald-50">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 blur-3xl [background:radial-gradient(circle_at_top,_rgba(34,197,94,0.22),_rgba(12,74,45,0)),radial-gradient(circle_at_20%_80%,_rgba(74,222,128,0.18),_rgba(10,47,36,0))]" />
      <header className="px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
          <Link
            href="#top"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-emerald-200 transition hover:text-emerald-100"
          >
            <Activity className="size-6" aria-hidden="true" />
            GreenOmega
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-emerald-200/80 md:flex">
            <Link href="#diagnosis" className="transition hover:text-emerald-100">
              Challenges
            </Link>
            <Link href="#proof" className="transition hover:text-emerald-100">
              Impact
            </Link>
            <Link href="#platform" className="transition hover:text-emerald-100">
              Platform
            </Link>
            <Link href="#cta" className="transition hover:text-emerald-100">
              Get in touch
            </Link>
          </nav>
          <Button asChild size="sm" variant="secondary" className="ml-auto md:ml-0">
            <Link href="#cta" className="font-semibold">
              Book a demo
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary" className="ml-auto md:ml-0">
            <Link href="/sign-in" className="font-semibold">
              Sign in
            </Link>
          </Button>
        </div>
      </header>

      <main className="px-6 pb-20 sm:px-10">
        <section id="top" className="mx-auto flex max-w-6xl flex-col gap-16 pb-24 pt-12 md:pb-32 md:pt-24">
          <div className="space-y-6 text-center md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-emerald-900/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80 shadow-lg">
              Make data-backed moves
            </span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-emerald-50 sm:text-5xl md:text-6xl">
              Make every ad dollar work harder
            </h1>
            <p className="mx-auto max-w-3xl text-pretty text-base text-emerald-100/90 sm:text-lg md:mx-0">
              GreenOmega puts a team of marketing scientists inside your ad stack—spotting wasted spend, showing where to reinvest, and automating the busy-work so your operators can focus on growth.
            </p>
            <div className="flex flex-col items-center gap-3 md:flex-row md:items-center">
              <Button asChild size="lg" className="min-w-[180px]">
                <Link href="/sign-in" className="font-semibold">
                  <span>Get started</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="min-w-[180px] text-emerald-100/80 hover:bg-emerald-900/40"
              >
                <Link href="#platform" className="font-semibold">
                  Explore the platform
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-emerald-950/65 p-8 shadow-2xl backdrop-blur sm:grid-cols-2">
            {performanceStories.map((story, index) => (
              <div
                key={index}
                className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-emerald-900/50 p-4 shadow-inner"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/70">
                  {story.type}
                </span>
                <p className="text-sm text-emerald-100/85">{story.text}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 rounded-3xl border border-white/10 bg-emerald-900/30 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/70">
                Trusted by marketing teams at
              </p>
              <p className="mt-3 text-emerald-50/90">
                Digital-first retailers, subscription leaders, and fintech disruptors scaling from $50M to $1B ARR rely on GreenOmega to govern their media dollars.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-emerald-200/80 sm:text-right">
              <span>Thrive Collective</span>
              <span>Northwind DTC</span>
              <span>Orbit Apparel</span>
              <span>Atlas Financial</span>
            </div>
          </div>
        </section>

        <section
          id="diagnosis"
          className="mx-auto max-w-6xl rounded-[2.5rem] border border-white/10 bg-emerald-950/70 p-10 shadow-2xl backdrop-blur"
        >
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-2">
              <span className="inline-flex items-center rounded-full bg-emerald-900/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200/80">
                Do more with less
              </span>
              <h2 className="text-balance text-3xl font-semibold text-emerald-50 sm:text-4xl">
                The growth mandate is getting tougher—your measurement has to keep up.
              </h2>
              <p className="text-base text-emerald-100/85">
                First-party data gaps, privacy walls, and platform spin make it impossible to see what truly moves the needle. GreenOmega rebuilds the marketing operating system around provable incrementality.
              </p>
            </div>
            <div className="grid gap-4 lg:col-span-3">
              {pressurePoints.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-emerald-900/40 p-6 shadow-lg transition duration-300 hover:border-emerald-400/60 hover:shadow-emerald-500/20"
                >
                  <h3 className="text-lg font-semibold text-emerald-50">{item.title}</h3>
                  <p className="mt-2 text-sm text-emerald-100/80">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="proof"
          className="mx-auto mt-24 grid max-w-6xl gap-6 rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-emerald-900/60 via-emerald-950/80 to-emerald-950/60 p-10 shadow-2xl backdrop-blur sm:grid-cols-3"
        >
          {proofPoints.map((stat) => (
            <div
              key={stat.label}
              className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-emerald-900/50 p-6 shadow-lg"
            >
              <p className="text-4xl font-semibold text-emerald-200">{stat.value}</p>
              <p className="mt-4 text-sm text-emerald-100/80">{stat.label}</p>
            </div>
          ))}
        </section>

        <section
          id="platform"
          className="mx-auto mt-24 max-w-6xl rounded-[2.5rem] border border-white/10 bg-emerald-950/70 p-10 shadow-2xl backdrop-blur"
        >
          <div className="flex flex-col gap-14 lg:flex-row">
            <div className="flex-1 space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-900/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200/80">
                Platform overview
              </span>
              <h2 className="text-balance text-3xl font-semibold text-emerald-50 sm:text-4xl">
                One operating system for provable marketing performance
              </h2>
              <p className="text-base text-emerald-100/85">
                GreenOmega fuses incrementality testing, media mix modeling, and creative analytics into a single workspace. Every channel, experiment, and decision traces back to verified revenue impact.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="#cta" className="font-semibold">
                    Talk to a strategist
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="text-emerald-100/80 hover:bg-emerald-900/40"
                >
                  <Link href="/case-studies" className="font-semibold">
                    See case studies
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              {platformModules.map((module) => (
                <div
                  key={module.title}
                  className="rounded-2xl border border-white/10 bg-emerald-900/40 p-6 shadow-lg"
                >
                  <module.icon className="size-7 text-emerald-300" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold text-emerald-50">
                    {module.title}
                  </h3>
                  <p className="mt-2 text-sm text-emerald-100/80">
                    {module.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="cta"
          className="mx-auto mt-24 flex max-w-6xl flex-col gap-10 rounded-[2.5rem] border border-emerald-400/40 bg-gradient-to-br from-emerald-800/70 via-emerald-900/80 to-emerald-950/80 p-10 text-center shadow-3xl backdrop-blur"
        >
          <div className="space-y-4">
            <h2 className="text-balance text-3xl font-semibold text-emerald-50 sm:text-4xl">
              Take back control from black-box metrics
            </h2>
            <p className="mx-auto max-w-3xl text-pretty text-base text-emerald-100/85">
              Break free from opaque reporting, trim CAC, and unlock provable revenue with auditable, real-time intelligence. Our team will map your media plans to measurable outcomes in the first workshop.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg">
              <span>Schedule a discovery call</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button asChild size="lg" variant="secondary" className="bg-emerald-200/10 text-emerald-950 hover:bg-emerald-200/20">
              <Link href="mailto:hello@greenomega.co" className="font-semibold">
                Email our team
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/40 px-6 py-10 text-sm text-emerald-200/70 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-semibold text-emerald-200">
            <Gauge className="size-5" aria-hidden="true" />
            GreenOmega
          </div>
          <p className="text-xs text-emerald-200/60">
            © {new Date().getFullYear()} GreenOmega. Make every ad dollar work harder.
          </p>
        </div>
      </footer>
    </div>
  )
}
