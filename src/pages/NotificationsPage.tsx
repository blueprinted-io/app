import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

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
    <div
      className={[
        "flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0",
        isUnread ? "bg-amber-50" : "bg-white",
      ].join(" ")}
    >
      {isUnread && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-amber" />
      )}
      {!isUnread && <span className="mt-1.5 h-2 w-2 shrink-0" />}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            {KIND_LABEL[notification.kind] ?? notification.kind}
          </span>
          <span className="text-xs text-gray-400">{formatDate(notification.created_at)}</span>
        </div>
        <p className="text-sm text-gray-800">{notification.message}</p>
        {link && (
          <Link to={link} className="mt-1 inline-block text-xs text-brand-amber hover:underline">
            View {notification.entity_type} →
          </Link>
        )}
      </div>

      {isUnread && (
        <button
          type="button"
          onClick={() => onRead(notification.id)}
          className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
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
    <div className="p-8 max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-gray-500">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isPending}
          >
            {readAllMutation.isPending ? "Marking…" : "Mark all read"}
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
          Loading…
        </div>
      )}

      {!isLoading && (!notifications || notifications.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Bell className="h-8 w-8 mb-3" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      )}

      {notifications && notifications.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
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
