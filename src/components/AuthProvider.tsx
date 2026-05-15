import { useEffect, useState } from "react";
import type { User } from "oidc-client-ts";
import { userManager } from "@/lib/auth";
import { AuthContext } from "@/context/AuthContext";

interface Props {
  children: React.ReactNode;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from session storage on mount.
    userManager
      .getUser()
      .then((u) => setUser(u ?? null))
      .finally(() => setIsLoading(false));

    // Keep state in sync when tokens are silently renewed or the user logs out
    // in another tab.
    const onUserLoaded = (u: User) => setUser(u);
    const onUserUnloaded = () => setUser(null);

    userManager.events.addUserLoaded(onUserLoaded);
    userManager.events.addUserUnloaded(onUserUnloaded);

    return () => {
      userManager.events.removeUserLoaded(onUserLoaded);
      userManager.events.removeUserUnloaded(onUserUnloaded);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: user !== null && !user.expired }}
    >
      {children}
    </AuthContext.Provider>
  );
}
