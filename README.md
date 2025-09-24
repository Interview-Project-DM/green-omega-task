# BlueAlpha Auth Demo Monorepo

This monorepo implements user authentication and a user dashboard using Next.js, FastAPI, and Clerk.

## Task
✅ Implement user authentication.
✅ Implement a user dashboard.



## General structure
- apps
    - api: fastapi backend with JWT authentication
    - web: nextjs frontend with Clerk authentication
- packages
    - ui: shadcn component library
    - docker: dockerized database setup (optional for auth)

## Prerequisites
- Node.js 20+
- pnpm 10 (`corepack enable pnpm@10`)
- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/getting-started/installation/)
- [Clerk account](https://clerk.com/) for authentication

## Setting up Clerk

1. **Create a Clerk account** at [clerk.com](https://clerk.com/) and create a new application
2. **Get your API keys** from the Clerk Dashboard:
   - Go to "API Keys" in your Clerk dashboard
   - Copy the "Publishable key" (starts with `pk_`)
   - Copy the "Secret key" (starts with `sk_`)
3. **Configure your domain** in Clerk:
   - In the Clerk dashboard, go to "Domains"
   - Add `localhost:3000` for development
   - Note your Clerk domain (e.g., `your-project.clerk.accounts.dev`)

## Environment Variables

Create `.env.local` at the repository root (both apps load it by default):

```bash
# Web app (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
API_URL=http://localhost:8000

# API (Clerk JWT validation)
CLERK_ISSUER=https://your-project.clerk.accounts.dev
CLERK_JWKS_URL=https://your-project.clerk.accounts.dev/.well-known/jwks.json
```

## Getting started

Run: **pnpm install**
- installs dependencies for nextjs (/apps/web)
- installs dependencies for fastapi (/apps/api)

Run: **pnpm dev**
- starts fastapi dev server (localhost:8000)
- starts next application in dev (localhost:3000)

Optional: Run **pnpm turbo run dev** to also spin up docker-compose /packages/docker
- 5432 for database
- 8080 for adminer (db ui)

## Available Routes

### Web App (Next.js)
- `/` - Home page
- `/sign-in` - Clerk sign-in page
- `/sign-up` - Clerk sign-up page
- `/dashboard` - Protected dashboard (requires authentication)
- `/api/me` - API route that proxies to FastAPI `/me` endpoint

### API (FastAPI)
- `GET /health` - Health check endpoint
- `GET /` - Root endpoint
- `GET /me` - User info endpoint (requires JWT authentication)

## Authentication Flow
1. Visit `http://localhost:3000/sign-in` to complete the Clerk sign-in flow
2. Navigate to `/dashboard` - unauthenticated users are redirected to `/sign-in`
3. The dashboard shows user info and links to `/api/me` which proxies to FastAPI
4. FastAPI validates the JWT using Clerk's JWKS and returns user data

## Frontend component library
### Usage

```bash
pnpm dlx shadcn@latest init
```

### Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

### Tailwind

Your `tailwind.config.ts` and `globals.css` are already set up to use the components from the `ui` package.

### Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button"
```



