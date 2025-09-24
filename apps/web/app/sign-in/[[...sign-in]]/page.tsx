import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex w-full items-center justify-center bg-muted/20 py-10">
      <SignIn
        routing="path"
        path="/sign-in"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  )
}
