import Link from "next/link"
import { redirect } from "next/navigation"
import { SignOutButton } from "@clerk/nextjs"
import { auth, currentUser } from "@clerk/nextjs/server"

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

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="mb-6">Welcome, {displayName}</p>
      <div className="flex items-center gap-3">
        <Link className="underline" href="/api/me">
          Check /api/me
        </Link>
        <SignOutButton>
          <button className="underline">Sign Out</button>
        </SignOutButton>
      </div>
    </main>
  )
}
