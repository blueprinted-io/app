import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// Plural entity_type as expected by the review API route
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
    <tr className="border-b border-gray-100 last:border-0">
      {/* Type */}
      <td className="px-4 py-3 align-top">
        <Badge variant="outline" className="whitespace-nowrap">
          {TYPE_LABEL[item.record_type] ?? item.record_type}
        </Badge>
      </td>

      {/* Title */}
      <td className="px-4 py-3 align-top">
        <Link to={href} className="text-sm font-medium text-gray-900 hover:text-brand-amber">
          {item.title}
        </Link>
        {item.domain && (
          <p className="mt-0.5 text-xs text-gray-400">{item.domain}</p>
        )}
      </td>

      {/* Submitted */}
      <td className="px-4 py-3 align-top text-sm text-gray-500 whitespace-nowrap">
        {formatDate(item.updated_at)}
      </td>

      {/* Claim status */}
      <td className="px-4 py-3 align-top">
        {claimedByMe && (
          <span className="text-xs text-brand-amber font-medium">Claimed by you</span>
        )}
        {claimedByOther && (
          <span className="text-xs text-gray-400">Claimed</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          {claimedByMe ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => releaseMutation.mutate()}
              disabled={anyPending}
            >
              {releaseMutation.isPending ? "Releasing…" : "Release"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => claimMutation.mutate()}
              disabled={anyPending || claimedByOther}
              title={claimedByOther ? "Claimed by another reviewer" : undefined}
            >
              {claimMutation.isPending ? "Claiming…" : "Claim"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setReturnDialogOpen(true)}
            disabled={anyPending}
          >
            Return
          </Button>
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
    // Refetch so the queue reflects current state even on error
    queryClient.invalidateQueries({ queryKey: ["review-queue"] });
    // Surface the error via a simple alert for now — a toast system would be better
    // but there's no toast infrastructure yet
    window.alert(msg);
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
      <p className="mt-1 text-sm text-gray-500">
        Submitted records in your assigned domains, excluding your own submissions.
      </p>

      <div className="mt-8">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
            Loading queue…
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">Failed to load review queue.</p>
        )}

        {queue && queue.total === 0 && (
          <p className="text-sm text-gray-500">Nothing awaiting review.</p>
        )}

        {queue && queue.total > 0 && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {queue.total} item{queue.total !== 1 ? "s" : ""} awaiting review
            </p>
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 w-24">
                      Type
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Title
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 w-32">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 w-32">
                      Claim
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 w-56">
                      Actions
                    </th>
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
    </div>
  );
}
