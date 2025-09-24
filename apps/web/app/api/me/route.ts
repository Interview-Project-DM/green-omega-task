import { auth } from "@clerk/nextjs/server";

const apiBaseUrl = process.env.API_URL ?? "http://localhost:8000"

export async function GET() {
  const { getToken } = await auth()
  const token = await getToken()

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }

  const response = await fetch(`${apiBaseUrl}/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  const body = await response.text()

  return new Response(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  })
}
