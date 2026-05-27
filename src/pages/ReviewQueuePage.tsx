import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { ReturnDialog } from "@/components/ReturnDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClaimInfo {
  claimed_by: string;
  expires_at: string;
}

interface QueueItem {
  id: string;
  record_type: string;
  title: string;
  domain: string | null;
  status: string;
  updated_at: string;
  created_by: string;
  claim: ClaimInfo | null;
}

interface QueueResponse {
  items: QueueItem[];
  total: number;
}

interface CurrentUser {
  id: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<string, string> = {
  task: "Task",
  workflow: "Workflow",
  principle: "Principle",
};

const TYPE_PLURAL: Record<string, string> = {
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

function recordHref(item: QueueItem): string {
  if (item.record_type === "task") return `/tasks/id/${item.id}`;
  if (item.record_type === "workflow") return `/workflows/${item.id}`;
  return `/principles/${item.id}`;
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

function QueueRow({
  item,
  currentUserId,
  onActionError,
}: {
  item: QueueItem;
  currentUserId: string | undefined;
  onActionError: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const entityType = TYPE_PLURAL[item.record_type] ?? item.record_type;
  const href = recordHref(item);

  function onSuccess() {
    queryClient.invalidateQueries({ queryKey: ["review-queue"] });
  }

  function onError(err: unknown) {
    const msg =
      err instanceof ApiError ? err.message : "An unexpected error occurred.";
    onActionError(msg);
  }

  const claimMutation = useMutation({
    mutationFn: () => api.post(`/review/${entityType}/${item.id}/claim`),
    onSuccess,
    onError,
  });

  const returnMutation = useMutation({
    mutationFn: (note: string) => api.post(`/review/${entityType}/${item.id}/return`, { note }),
    onSuccess: () => { setReturnDialogOpen(false); onSuccess(); },
    onError,
  });

  const releaseMutation = useMutation({
    mutationFn: () => api.post(`/review/${entityType}/${item.id}/release`),
    onSuccess,
    onError,
  });

  const anyPending =
    claimMutation.isPending ||
    returnMutation.isPending ||
    releaseMutation.isPending;

  const claimedByMe = !!currentUserId && item.claim?.claimed_by === currentUserId;
  const claimedByOther = !!item.claim && !claimedByMe;

  return (
    <tr style={{ borderBottom: "1px solid var(--bp-border)" }}>
      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
        <span style={typePillStyle}>{TYPE_LABEL[item.record_type] ?? item.record_type}</span>
      </td>
      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
        <Link to={href} style={{ fontSize: 13, fontWeight: 600, color: "var(--bp-ink)", textDecoration: "none" }}>
          {item.title}
        </Link>
        {item.domain && (
          <p style={{ marginTop: 2, fontSize: 11, color: "var(--bp-muted)" }}>{item.domain}</p>
        )}
      </td>
      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
        <StatusBadge status={item.status} />
      </td>
      <td style={{ padding: "10px 14px", verticalAlign: "top", fontSize: 12, color: "var(--bp-muted)", whiteSpace: "nowrap" }}>
        {formatDate(item.updated_at)}
      </td>
      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
        {claimedByMe && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--bp-accent-deep)" }}>Claimed by you</span>
        )}
        {claimedByOther && (
          <span style={{ fontSize: 11, color: "var(--bp-muted)" }}>Claimed</span>
        )}
      </td>
      <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {claimedByMe ? (
            <button className="bp-btn bp-btn--ghost" style={{ fontSize: 12, padding: "4px 10px" }}
              onClick={() => releaseMutation.mutate()} disabled={anyPending}>
              {releaseMutation.isPending ? "Releasing…" : "Release"}
            </button>
          ) : (
            <button className="bp-btn bp-btn--ghost" style={{ fontSize: 12, padding: "4px 10px" }}
              onClick={() => claimMutation.mutate()} disabled={anyPending || claimedByOther}
              title={claimedByOther ? "Claimed by another reviewer" : undefined}>
              {claimMutation.isPending ? "Claiming…" : "Claim"}
            </button>
          )}
          <button className="bp-btn bp-btn--ghost" style={{ fontSize: 12, padding: "4px 10px" }}
            onClick={() => setReturnDialogOpen(true)} disabled={anyPending}>
            Return
          </button>
          <ReturnDialog
            open={returnDialogOpen}
            onOpenChange={setReturnDialogOpen}
            onConfirm={(note) => returnMutation.mutate(note)}
            isPending={returnMutation.isPending}
          />
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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

export function ReviewQueuePage() {
  const queryClient = useQueryClient();

  const { data: queue, isLoading, error } = useQuery({
    queryKey: ["review-queue"],
    queryFn: () => api.get<QueueResponse>("/review/queue"),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<CurrentUser>("/users/me"),
  });

  function handleActionError(msg: string) {
    queryClient.invalidateQueries({ queryKey: ["review-queue"] });
    window.alert(msg);
  }

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
          <div className="bp-card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Submitted</th>
                  <th style={thStyle}>Claim</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.items.map((item) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    currentUserId={currentUser?.id}
                    onActionError={handleActionError}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
