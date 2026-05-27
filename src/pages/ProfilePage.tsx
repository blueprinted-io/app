import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface MeResponse {
  id: string;
  sub: string;
  email: string;
  display_name: string | null;
  roles: string[];
  created_at: string;
}

export function ProfilePage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/users/me"),
  });

  return (
    <div className="bp-page" style={{ maxWidth: 560 }}>
      <div className="bp-page__head">
        <div>
          <h1>Profile</h1>
          <p className="bp-page__sub">Your account details.</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <section className="bp-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bp-border)" }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)" }}>Identity</h3>
          </div>
          <Row label="Name" value={user?.profile.name} />
          <Row label="Email" value={user?.profile.email} />
        </section>

        <section className="bp-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bp-border)" }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)" }}>Platform account</h3>
          </div>
          {isLoading && <p className="bp-muted" style={{ fontSize: 13, padding: "12px 16px" }}>Loading…</p>}
          {error && <p style={{ fontSize: 13, color: "var(--bp-danger)", padding: "12px 16px" }}>Failed to load profile from API.</p>}
          {data && (
            <>
              <Row label="Display name" value={data.display_name ?? "—"} />
              <Row label="Roles" value={data.roles.join(", ") || "none"} />
              <Row label="Member since" value={formatDate(data.created_at)} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--bp-border)" }}>
      <dt style={{ fontSize: 13, color: "var(--bp-muted)" }}>{label}</dt>
      <dd style={{ fontSize: 13, fontWeight: 500, color: "var(--bp-ink)" }}>{value ?? "—"}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
