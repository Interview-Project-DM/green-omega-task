import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@workspace/ui/components/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";

export default async function Dashboard() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const user = await currentUser()

  const displayName =
    user?.firstName ??
    user?.username ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "User"

  const email = user?.emailAddresses?.[0]?.emailAddress ?? ""
  const avatarUrl = user?.imageUrl ?? "https://avatars.dicebear.com/api/initials/User.svg"

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          displayName,
          email,
          avatarUrl,
        }}
      />
      <SidebarInset>
        <div className="min-h-screen bg-muted/20">
          {/* Fixed top bar with toggle button */}
          <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-4 px-4">
              <SidebarTrigger className="h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors" />
              <div className="flex-1" />
              <div className="flex gap-2">
                <Link href="/api/me" target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="sm">View API Payload</Button>
                </Link>
                <Button size="sm">New Report</Button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
            <header className="mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome back, {displayName}
                </h1>
                <p className="text-sm text-gray-500">
                  Here&apos;s what&apos;s happening across your account today.
                </p>
              </div>
            </header>

            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <DashboardCard
                title="Active Sessions"
                value="3"
                description="Devices currently logged in"
              />
              <DashboardCard
                title="Last Login"
                value={user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : "Unknown"}
                description="Most recent authentication event"
              />
              <DashboardCard
                title="Pending Actions"
                value="2"
                description="Security tasks awaiting review"
              />
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Profile Summary</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Review your personal information and keep your profile details up to date to ensure account security.
                </p>
                <dl className="mt-6 space-y-3 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-900">Name</dt>
                    <dd>{displayName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-900">Email</dt>
                    <dd>{email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-900">Clerk ID</dt>
                    <dd className="font-mono text-xs text-gray-500">{user?.id}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Security Checklist</h2>
                <ul className="mt-4 space-y-3 text-sm text-gray-600">
                  <ChecklistItem label="Enable multi-factor authentication" complete />
                  <ChecklistItem label="Review active devices" />
                  <ChecklistItem label="Download recovery codes" />
                </ul>
              </div>
            </section>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}


function DashboardCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      <p className="mt-2 text-xs text-gray-400">{description}</p>
    </div>
  )
}

function ChecklistItem({ label, complete = false }: { label: string; complete?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
          complete ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
        }`}
      >
        {complete ? "✓" : "!"}
      </span>
      <span className="leading-tight text-gray-700">{label}</span>
    </li>
  )
}
