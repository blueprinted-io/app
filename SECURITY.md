# Security Policy

## Reporting a vulnerability

This is a private project. Report security issues directly to the maintainer:

**Email:** mathesonewan@gmail.com

Please include a description, reproduction steps, and potential impact. Do not open a public GitHub issue for security vulnerabilities.

## Dependency scanning

npm dependencies are audited via `npm audit`, which runs automatically on a weekly schedule via GitHub Actions.

To run locally:

```bash
npm audit
```

## Secrets

- No secrets are stored in this repository.
- VITE env vars (`VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID`, `VITE_API_BASE_URL`) are build-time configuration — not secrets.
- See `.gitignore` for ignored secret file patterns.

## Authentication

- Auth is handled client-side via `oidc-client-ts` with Authentik (self-hosted OIDC).
- The frontend never handles or stores raw credentials — only OIDC tokens managed by the library.
- Token validation is performed by the backend (`platform/`) on every API request.
