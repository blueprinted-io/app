import { UserManager, WebStorageStateStore } from "oidc-client-ts";

const authority = import.meta.env.VITE_OIDC_AUTHORITY as string | undefined;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined;

if (!authority || !clientId) {
  throw new Error(
    "Missing required env vars: VITE_OIDC_AUTHORITY and VITE_OIDC_CLIENT_ID must be set."
  );
}

export const userManager = new UserManager({
  authority,
  client_id: clientId,
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: `${window.location.origin}/login`,
  response_type: "code",
  scope: "openid profile email blueprinted_roles",
  // PKCE is automatic with response_type=code in oidc-client-ts.
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  // Authentik sets X-Frame-Options: deny so iframe-based silent renew is blocked.
  // Disable it to suppress the console flood; session tokens last long enough
  // that users just need to re-login when they expire.
  automaticSilentRenew: false,
});

export async function signIn(): Promise<void> {
  await userManager.signinRedirect();
}

export async function signOut(): Promise<void> {
  await userManager.signoutRedirect();
}

export async function handleCallback(): Promise<void> {
  await userManager.signinRedirectCallback();
}

export async function getAccessToken(): Promise<string | null> {
  const user = await userManager.getUser();
  return user?.access_token ?? null;
}
