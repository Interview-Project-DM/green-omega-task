import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex w-full items-center justify-center bg-muted/20 py-10">
      <SignUp
        routing="path"
        path="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  )
}
