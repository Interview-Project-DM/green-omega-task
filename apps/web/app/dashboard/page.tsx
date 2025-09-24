import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { MarketingMixDashboard } from "@/components/marketing-mix-dashboard";
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
                <Button size="sm">New Report</Button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
            <header className="mb-10">
              <h1 className="text-3xl font-bold tracking-tight text-emerald-50">
                Welcome back, {displayName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-emerald-100/80">
                Explore how your media mix performs across geographies, channels, and national benchmarks. Every
                chart below streams directly from the GreenOmega marketing science service.
              </p>
            </header>

            <MarketingMixDashboard />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
