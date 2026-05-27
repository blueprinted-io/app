import { useAuth } from "@/context/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  const roles: string[] = (user?.profile["groups"] as string[]) ?? [];
  const name = user?.profile.name ?? user?.profile.email ?? "there";

  return (
    <div className="bp-page">
      <div className="bp-page__head">
        <div>
          <h1>Welcome back, {name.split(" ")[0]}</h1>
          <p className="bp-page__sub">
            {roles.includes("admin") ? "Admin" : "Contributor"} dashboard
          </p>
        </div>
      </div>

      {/* Placeholder — analytics and widgets added in next session (§23.2) */}
      <div className="bp-card" style={{ padding: "48px 24px", textAlign: "center" }}>
        <p className="bp-muted" style={{ fontSize: 13 }}>
          Dashboard content coming in Sprint 8 continuation.
        </p>
      </div>
    </div>
  );
}
