# Blueprinted App

React frontend for blueprinted.io. Independent git repository — do not treat as part of a monorepo.

## Stack

- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** + **Base UI** (headless components)
- **TanStack Query** for server state
- **oidc-client-ts** for OIDC auth (Authentik, RS256 JWT)
- **Lucide React** for icons

## Repo layout

```
src/
  components/   shared UI components
  pages/        route-level page components
  lib/          api client, auth, utilities
public/         static assets
```

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Type check | `npm run typecheck` |
| Build | `npm run build` |
| Preview build | `npm run preview` |

## Key constraints

- This repo has no backend code. API calls go to `platform/` (FastAPI on port 8000 in dev).
- Auth is handled entirely by `oidc-client-ts` — tokens are RS256 JWTs issued by Authentik.
- Do not add a backend, server-side rendering, or API routes to this repo.
- `git` commands must be run from inside `app/` — this is not a monorepo root.
- VITE env vars (`VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID`, `VITE_API_BASE_URL`) are required at build time; see CI for placeholder values.

## Related

- Backend: `../platform/` (blueprinted-io/platform)
- Workspace root: `../CLAUDE.md`
