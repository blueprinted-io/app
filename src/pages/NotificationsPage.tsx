import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";

interface Notification {
  id: string;
  kind: string;
  entity_type: string;
  entity_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

const KIND_LABEL: Record<string, string> = {
  record_confirmed: "Confirmed",
  record_returned: "Returned",
  record_submitted: "Submitted",
  claim_made: "Claimed",
  claim_expired: "Claim expired",
  ingestion_complete: "Ingestion complete",
  ingestion_failed: "Ingestion failed",
};

function entityLink(n: Notification): string | null {
  switch (n.entity_type) {
    case "task": return `/tasks/${n.entity_id}/1`;
    case "workflow": return `/workflows/${n.entity_id}`;
    case "principle": return `/principles/${n.entity_id}`;
    case "ingestion": return `/ingestion/${n.entity_id}`;
    default: return null;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const link = entityLink(notification);
  const isUnread = notification.read_at === null;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 14px",
      borderBottom: "1px solid var(--bp-border)",
      background: isUnread ? "color-mix(in oklab, var(--bp-accent) 6%, var(--bp-panel))" : "var(--bp-panel)",
    }}>
      <span style={{ marginTop: 6, width: 8, height: 8, flexShrink: 0, borderRadius: "50%", background: isUnread ? "var(--bp-accent)" : "transparent" }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--bp-muted)" }}>
            {KIND_LABEL[notification.kind] ?? notification.kind}
          </span>
          <span style={{ fontSize: 11, color: "var(--bp-muted)" }}>{formatDate(notification.created_at)}</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--bp-ink)" }}>{notification.message}</p>
        {link && (
          <Link to={link} className="bp-link" style={{ marginTop: 4, display: "inline-block", fontSize: 12 }}>
            View {notification.entity_type} →
          </Link>
        )}
      </div>
      {isUnread && (
        <button
          type="button"
          onClick={() => onRead(notification.id)}
          style={{ flexShrink: 0, fontSize: 12, color: "var(--bp-muted)", background: "none", border: "none", cursor: "pointer" }}
        >
          Mark read
        </button>
      )}
    </div>
  );
}

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<Notification[]>("/notifications?limit=50"),
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications?.filter((n) => n.read_at === null).length ?? 0;

  return (
    <div className="bp-page" style={{ maxWidth: 620 }}>
      <div className="bp-page__head">
        <div>
          <h1>Notifications</h1>
          {unreadCount > 0 && <p className="bp-page__sub">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="bp-btn bp-btn--ghost"
            style={{ fontSize: 12, padding: "4px 12px" }}
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isPending}
          >
            {readAllMutation.isPending ? "Marking…" : "Mark all read"}
          </button>
        )}
      </div>

      {isLoading && <p className="bp-muted" style={{ fontSize: 13 }}>Loading…</p>}

      {!isLoading && (!notifications || notifications.length === 0) && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0", color: "var(--bp-muted)" }}>
          <Bell size={32} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 13 }}>No notifications yet.</p>
        </div>
      )}

      {notifications && notifications.length > 0 && (
        <div className="bp-card" style={{ overflow: "hidden", padding: 0 }}>
          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onRead={(id) => readMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
