import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentRecord {
  id: string;
  record_type: string;
  title: string;
  domain: string | null;
  updated_at: string;
}

interface ContributorStats {
  my_drafts: number;
  my_submitted: number;
  my_returned: number;
  recently_returned: RecentRecord[];
}

interface ReviewerStats {
  queue_depth: number;
}

interface DomainStaleness {
  domain: string;
  stale_count: number;
}

interface AdminStats {
  confirmed_30d: number;
  return_rate_30d: number;
  stale_confirmed_count: number;
  stale_by_domain: DomainStaleness[];
  staleness_threshold_days: number;
}

interface DashboardData {
  contributor: ContributorStats;
  reviewer: ReviewerStats;
  admin: AdminStats | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_PATH: Record<string, string> = {
  task: "tasks",
  workflow: "workflows",
  principle: "principles",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className="bp-card"
      style={{
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        borderTop: accent ? "3px solid var(--bp-accent)" : undefined,
      }}
    >
      <span style={{ fontSize: 28, fontWeight: 200, lineHeight: 1.1, color: "var(--bp-ink)" }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: "var(--bp-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}
      </span>
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="bp-section-head" style={{ marginTop: 8 }}>
      <h3>{title}</h3>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const { user } = useAuth();
  const name = user?.profile.name ?? user?.profile.email ?? "there";
  const roles: string[] = (user?.profile["groups"] as string[]) ?? [];
  const isAdmin = roles.includes("admin");

  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: () => api.get<DashboardData>("/analytics/dashboard"),
  });

  return (
    <div className="bp-page">
      <div className="bp-page__head">
        <div>
          <h1>Welcome back, {(name as string).split(" ")[0]}</h1>
          <p className="bp-page__sub">
            {isAdmin ? "Admin" : "Contributor"} dashboard
          </p>
        </div>
      </div>

      {isLoading && (
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading…</p>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Failed to load dashboard.</p>
      )}

      {data && (
        <>
          {/* Contributor section — always visible */}
          <SectionHead title="My work" />
          <div className="bp-grid-3" style={{ gap: 12 }}>
            <StatCard label="Drafts" value={data.contributor.my_drafts} />
            <StatCard label="Awaiting review" value={data.contributor.my_submitted} />
            <StatCard
              label="Returned"
              value={data.contributor.my_returned}
              accent={data.contributor.my_returned > 0}
            />
          </div>

          {data.contributor.recently_returned.length > 0 && (
            <>
              <SectionHead title="Recently returned" />
              <div className="bp-card" style={{ padding: 0, overflow: "hidden" }}>
                {data.contributor.recently_returned.map((rec) => {
                  const path = TYPE_PATH[rec.record_type];
                  return (
                    <div
                      key={rec.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--bp-border)",
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Link
                          to={`/${path}/${rec.id}`}
                          style={{ color: "var(--bp-ink)", fontWeight: 500 }}
                        >
                          {rec.title}
                        </Link>
                        {rec.domain && (
                          <span className="bp-muted" style={{ fontSize: 11 }}>
                            {rec.record_type} · {rec.domain}
                          </span>
                        )}
                      </div>
                      <span className="bp-muted">{formatDate(rec.updated_at)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Review section — always visible */}
          <SectionHead title="Review queue" />
          <Link to="/review" style={{ textDecoration: "none" }}>
            <StatCard
              label="Awaiting review in my domains"
              value={data.reviewer.queue_depth}
              accent={data.reviewer.queue_depth > 0}
            />
          </Link>

          {/* Admin section */}
          {data.admin && (
            <>
              <SectionHead title="Platform health" />
              <div className="bp-grid-3" style={{ gap: 12 }}>
                <StatCard label="Confirmed (30 days)" value={data.admin.confirmed_30d} accent />
                <StatCard label="Return rate (30 days)" value={pct(data.admin.return_rate_30d)} />
                <StatCard
                  label={`Stale confirmed (>${data.admin.staleness_threshold_days}d)`}
                  value={data.admin.stale_confirmed_count}
                  accent={data.admin.stale_confirmed_count > 0}
                />
              </div>

              {data.admin.stale_by_domain.length > 0 && (
                <>
                  <SectionHead title="Stale by domain" />
                  <div className="bp-card" style={{ padding: 0, overflow: "hidden" }}>
                    {data.admin.stale_by_domain.map((d) => (
                      <div
                        key={d.domain}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 16px",
                          borderBottom: "1px solid var(--bp-border)",
                          fontSize: 13,
                        }}
                      >
                        <span>{d.domain}</span>
                        <span style={{ fontWeight: 600, color: "var(--bp-danger)" }}>
                          {d.stale_count}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
