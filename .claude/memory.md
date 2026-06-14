# Blueprinted App — Project Memory

Durable context for AI harness sessions. Update when decisions or constraints change.

## Architecture

- Pure SPA — no SSR, no API routes, no backend code in this repo.
- Auth: `oidc-client-ts` handles the full OIDC flow with Authentik. Tokens are RS256 JWTs. The platform backend verifies them independently.
- API: all calls go to the FastAPI platform at `VITE_API_BASE_URL` (localhost:8000 in dev).
- State: TanStack Query for server state; no global client-side state manager.
- UI: Tailwind + Base UI (headless). No component library like shadcn/MUI.

## Key constraints

- Independent git repo — not a monorepo. Run `git` from inside `app/`.
- No tests yet. CI runs typecheck + build only.
- VITE env vars must be present at build time (see `.github/workflows/ci.yml` for CI placeholders).
- Do not add SSR, API routes, or backend logic.

## Sprint state

- See `../platform/SPRINTS.md` for overall sprint history.
- App changes are tracked alongside platform work in `../platform/SESSIONS.md`.

## Decisions

- Base UI chosen over shadcn for headless flexibility without the copy-paste overhead.
- TanStack Query preferred over SWR — better devtools, mutation handling, and invalidation control.
- Authentik OIDC (self-hosted) — no third-party auth provider dependency.
