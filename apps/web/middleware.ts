import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/me",
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    const { userId } = await auth()
    if (!userId) {
      return Response.redirect(new URL('/sign-in', req.url))
    }
  }
})

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
}
