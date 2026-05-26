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
  // offline_access causes Authentik to issue a refresh token.
  // oidc-client-ts uses grant_type=refresh_token for silent renew, bypassing
  // Authentik's X-Frame-Options: deny that blocks the iframe approach.
  scope: "openid profile email blueprinted_roles offline_access",
  // PKCE is automatic with response_type=code in oidc-client-ts.
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  automaticSilentRenew: true,
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
