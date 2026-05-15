# blueprinted — app

React frontend for the Blueprinted knowledge governance platform.

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · TanStack Query · oidc-client-ts

---

## Development setup

```bash
cp .env.example .env.local
# Fill in VITE_OIDC_AUTHORITY and VITE_OIDC_CLIENT_ID
npm install
npm run dev
```

The Vite dev server proxies `/api/*` requests to the backend (default `http://localhost:8000`),
so CORS is never an issue in development.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_OIDC_AUTHORITY` | Yes | Authentik OIDC authority URL (e.g. `https://auth.example.com/application/o/blueprinted/`) |
| `VITE_OIDC_CLIENT_ID` | Yes | OIDC client ID registered in Authentik |
| `VITE_API_BASE_URL` | No | Backend URL for the Vite dev proxy (default: `http://localhost:8000`) |

## Auth flow

OIDC Authorization Code flow with PKCE via Authentik. On login:
1. User clicks "Sign in with Authentik"
2. Browser redirects to Authentik authorization endpoint
3. After consent, Authentik redirects to `/callback` with an authorization code
4. `CallbackPage` exchanges the code for tokens using the PKCE verifier
5. Tokens stored in `sessionStorage`; user is redirected to the dashboard

The redirect URI registered in Authentik must match `{origin}/callback`.
For local dev: `http://localhost:5173/callback`.

## Production notes

- CORS: the backend does not currently have CORS middleware configured. In production,
  either serve the frontend from the same origin as the API, or add
  `CORSMiddleware` to `api/main.py` with the frontend origin whitelisted.
- Token storage: `sessionStorage` — tokens are cleared when the tab is closed.
