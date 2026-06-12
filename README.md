# blueprinted — App

React frontend for the blueprinted.io knowledge governance platform.

The UI is one consumer of the platform API — no privileged routes, no server-rendered shortcuts. It talks to [`blueprinted-io/platform`](https://github.com/blueprinted-io/platform) over OIDC-authenticated REST.

> **Status:** In active development. Tracking the platform API as features ship.

---

## Stack

| | |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Data fetching | TanStack Query |
| Auth | oidc-client-ts (Authorization Code + PKCE via Authentik) |

---

## Development setup

```bash
cp .env.example .env.local
# Fill in VITE_OIDC_AUTHORITY and VITE_OIDC_CLIENT_ID
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to the backend (default `http://localhost:8000`), so CORS is never an issue in local development.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_OIDC_AUTHORITY` | Yes | Authentik OIDC authority URL (e.g. `https://auth.example.com/application/o/blueprinted/`) |
| `VITE_OIDC_CLIENT_ID` | Yes | OIDC client ID registered in Authentik |
| `VITE_API_BASE_URL` | No | Backend URL for the Vite proxy (default: `http://localhost:8000`) |

---

## Auth flow

Authorization Code flow with PKCE via Authentik:

1. User clicks "Sign in"
2. Browser redirects to Authentik authorization endpoint
3. Authentik redirects back to `/callback` with an authorization code
4. `CallbackPage` exchanges the code for tokens using the PKCE verifier
5. Tokens stored in `sessionStorage`; user redirected to the dashboard

The redirect URI registered in Authentik must match `{origin}/callback`. For local dev: `http://localhost:5173/callback`.

---

## Production notes

- **CORS:** Serve the frontend from the same origin as the API, or add `CORSMiddleware` to `api/main.py` with the frontend origin whitelisted.
- **Token storage:** `sessionStorage` — tokens clear when the tab closes.

---

## Related repos

| Repo | Description |
|------|-------------|
| [`blueprinted-io/platform`](https://github.com/blueprinted-io/platform) | Python backend this app consumes |
| [`blueprinted-io/core`](https://github.com/blueprinted-io/core) | Original MVP — best place to understand the data model |
