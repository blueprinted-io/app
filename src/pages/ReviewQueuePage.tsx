import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueueItem {
  id: string;
  record_type: string;
  title: string;
  domain: string | null;
  status: string;
  updated_at: string;
}

interface QueueResponse {
  items: QueueItem[];
  total: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<string, string> = {
  task: "Task",
  workflow: "Workflow",
  principle: "Principle",
};

function recordHref(item: QueueItem): string {
  if (item.record_type === "task") return `/tasks/id/${item.id}`;
  if (item.record_type === "workflow") return `/workflows/${item.id}`;
  return `/principles/${item.id}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

const typePillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px", borderRadius: 6,
  fontSize: 11, fontWeight: 700,
  background: "color-mix(in oklab, var(--bp-accent-blue) 10%, var(--bp-bg))",
  color: "var(--bp-accent-blue)",
  border: "1px solid color-mix(in oklab, var(--bp-accent-blue) 20%, var(--bp-border))",
  whiteSpace: "nowrap" as const,
};

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 11, fontWeight: 800,
  letterSpacing: ".05em", textTransform: "uppercase",
  color: "var(--bp-muted)",
  borderBottom: "1px solid var(--bp-border)",
  background: "var(--bp-bg)",
  whiteSpace: "nowrap",
};

function QueueRow({ item }: { item: QueueItem }) {
  const navigate = useNavigate();

  return (
    <tr
      style={{ borderBottom: "1px solid var(--bp-border)", cursor: "pointer" }}
      onClick={() => navigate(recordHref(item))}
    >
      <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
        <span style={typePillStyle}>{TYPE_LABEL[item.record_type] ?? item.record_type}</span>
      </td>
      <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--bp-ink)" }}>
          {item.title}
        </span>
        {item.domain && (
          <p style={{ marginTop: 2, fontSize: 11, color: "var(--bp-muted)" }}>{item.domain}</p>
        )}
      </td>
      <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
        <StatusBadge status={item.status} />
      </td>
      <td style={{ padding: "10px 14px", verticalAlign: "middle", fontSize: 12, color: "var(--bp-muted)", whiteSpace: "nowrap" }}>
        {formatDate(item.updated_at)}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ReviewQueuePage() {
  const { data: queue, isLoading, error } = useQuery({
    queryKey: ["review-queue"],
    queryFn: () => api.get<QueueResponse>("/review/queue"),
  });

  return (
    <div className="bp-page">
      <div className="bp-page__head">
        <div>
          <h1>Review Queue</h1>
          <p className="bp-page__sub">Submitted records in your assigned domains, excluding your own submissions.</p>
        </div>
      </div>

      {isLoading && (
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading queue…</p>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Failed to load review queue.</p>
      )}

      {queue && queue.total === 0 && (
        <p className="bp-muted" style={{ fontSize: 13 }}>Nothing awaiting review.</p>
      )}

      {queue && queue.total > 0 && (
        <>
          <p className="bp-muted" style={{ fontSize: 13 }}>
            {queue.total} item{queue.total !== 1 ? "s" : ""} awaiting review
          </p>
          <div className="bp-card" style={{ overflow: "hidden", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {queue.items.map((item) => (
                  <QueueRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
