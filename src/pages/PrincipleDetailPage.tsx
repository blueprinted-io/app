import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ReturnDialog } from "@/components/ReturnDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CurrentUser {
  id: string;
}

interface PrincipleVersionSummary {
  id: string;
  version: number;
  status: string;
}

interface PrincipleDetail {
  id: string;
  record_id: string;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  title: string;
  summary: string;
  explanation: string;
  analogies: string | null;
  domain: string;
  tags: string[];
  change_note: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PrincipleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);

  const { data: principle, isLoading, error } = useQuery({
    queryKey: ["principles", id],
    queryFn: () => api.get<PrincipleDetail>(`/principles/${id}`),
    enabled: !!id,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<CurrentUser>("/users/me"),
  });

  function onSuccess() {
    queryClient.invalidateQueries({ queryKey: ["principles", id] });
    queryClient.invalidateQueries({ queryKey: ["principles"] });
    queryClient.invalidateQueries({ queryKey: ["review-queue"] });
  }

  const { data: queue } = useQuery({
    queryKey: ["review-queue"],
    queryFn: () => api.get<{ items: { id: string; claim: { claimed_by: string } | null }[] }>("/review/queue"),
    enabled: principle?.status === "submitted",
  });

  const activeClaim = queue?.items.find((i) => i.id === principle?.id)?.claim ?? null;
  const claimHeldByMe = !!currentUser && activeClaim?.claimed_by === currentUser.id;

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/principles/${principle!.id}/submit`),
    onSuccess,
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post(`/principles/${principle!.id}/confirm`),
    onSuccess,
  });

  const returnMutation = useMutation({
    mutationFn: (note: string) => api.post(`/principles/${principle!.id}/return`, { note }),
    onSuccess: () => { setReturnDialogOpen(false); onSuccess(); },
  });

  const releaseMutation = useMutation({
    mutationFn: () => api.post(`/review/principles/${principle!.id}/release`),
    onSuccess,
  });

  const reviseMutation = useMutation({
    mutationFn: (note?: string) =>
      api.post<PrincipleDetail>(`/principles/${principle!.id}/revise`, note ? { note } : {}),
    onSuccess: (newPrinciple) => {
      setReviseDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["principles"] });
      navigate(`/principles/${newPrinciple.id}/edit`);
    },
  });

  const { data: versions } = useQuery({
    queryKey: ["principles", id, "versions"],
    queryFn: () => api.get<PrincipleVersionSummary[]>(`/principles/${principle!.record_id}/versions`),
    enabled: !!principle,
  });

  const actionError = [submitMutation, confirmMutation, returnMutation, reviseMutation]
    .map((m) => m.error)
    .find(Boolean);

  const actionErrorMessage =
    actionError instanceof ApiError
      ? actionError.message
      : actionError
        ? "An unexpected error occurred."
        : null;

  const isSelf = !!currentUser && !!principle && currentUser.id === principle.created_by;
  const anyPending =
    submitMutation.isPending ||
    confirmMutation.isPending ||
    returnMutation.isPending ||
    releaseMutation.isPending ||
    reviseMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
        Loading principle…
      </div>
    );
  }

  if (error || !principle) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Principle not found or failed to load.</p>
        <Link to="/principles" className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to principles
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link
        to="/principles"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Principles
      </Link>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <StatusBadge status={principle.status} />
          <span className="text-sm text-gray-400">v{principle.version}</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{principle.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>{principle.domain}</span>
          <span>Updated {formatDate(principle.updated_at)}</span>
        </div>
      </div>

      {/* Version history */}
      {versions && versions.length > 1 && (
        <div className="mb-6 flex items-center gap-2 text-sm">
          <span className="text-gray-400">Versions:</span>
          {versions.map((v) => {
            const isCurrent = v.id === principle.id;
            return isCurrent ? (
              <span
                key={v.id}
                className="rounded px-2 py-0.5 bg-gray-100 font-medium text-gray-700"
              >
                v{v.version}
              </span>
            ) : (
              <Link
                key={v.id}
                to={`/principles/${v.id}`}
                className="rounded px-2 py-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                v{v.version}
                <span className="ml-1 text-xs text-gray-400">({v.status})</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Action bar */}
      {principle.status === "draft" && isSelf && (
        <div className="mb-8 flex items-center gap-3">
          <Button onClick={() => submitMutation.mutate()} disabled={anyPending}>
            {submitMutation.isPending ? "Submitting…" : "Submit for review"}
          </Button>
        </div>
      )}

      {principle.status === "submitted" && (
        <div className="mb-8 flex items-center gap-3">
          {!isSelf && (
            <Button onClick={() => confirmMutation.mutate()} disabled={anyPending}>
              {confirmMutation.isPending ? "Confirming…" : "Confirm"}
            </Button>
          )}
          <Button
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
          {claimHeldByMe && (
            <Button
              variant="outline"
              onClick={() => releaseMutation.mutate()}
              disabled={anyPending}
            >
              {releaseMutation.isPending ? "Releasing…" : "Release claim"}
            </Button>
          )}
          {isSelf && (
            <p className="text-sm text-gray-400">You cannot confirm your own submission.</p>
          )}
        </div>
      )}

      {principle.change_note && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">
            {principle.status === "returned" ? "Return note" : "Revision note"}
          </p>
          <p className="text-sm text-amber-900">{principle.change_note}</p>
        </div>
      )}

      <div className="mb-8 flex items-center gap-3">
        {principle.status === "draft" && isSelf ? (
          <Link to={`/principles/${principle.id}/edit`} className={buttonVariants({ variant: "outline" })}>
            Edit principle
          </Link>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => {
                if (principle.status === "returned") {
                  reviseMutation.mutate(undefined);
                } else {
                  setReviseDialogOpen(true);
                }
              }}
              disabled={anyPending}
            >
              {reviseMutation.isPending ? "Creating draft…" : "Revise principle"}
            </Button>
            <ReturnDialog
              open={reviseDialogOpen}
              onOpenChange={setReviseDialogOpen}
              onConfirm={(note) => reviseMutation.mutate(note)}
              isPending={reviseMutation.isPending}
              title="Revise principle"
              noteLabel="Reason for revision"
              placeholder="Explain why this principle needs to be revised…"
              confirmLabel="Create draft"
              pendingLabel="Creating draft…"
            />
          </>
        )}
      </div>

      {actionErrorMessage && (
        <div className="mb-8 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {actionErrorMessage}
        </div>
      )}

      <div className="space-y-8">
        <Section title="Summary">
          <p className="text-gray-700">{principle.summary}</p>
        </Section>

        <Section title="Explanation">
          <p className="text-gray-700 whitespace-pre-wrap">{principle.explanation}</p>
        </Section>

        {principle.analogies && (
          <Section title="Analogies">
            <p className="text-gray-700 whitespace-pre-wrap">{principle.analogies}</p>
          </Section>
        )}

        {principle.tags.length > 0 && (
          <Section title="Tags">
            <div className="flex flex-wrap gap-2">
              {principle.tags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </Section>
        )}

        <Section title="Details">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-400">Created</dt>
              <dd className="text-gray-700">{formatDate(principle.created_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Last updated</dt>
              <dd className="text-gray-700">{formatDate(principle.updated_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Version</dt>
              <dd className="text-gray-700">v{principle.version}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Record ID</dt>
              <dd className="font-mono text-xs text-gray-500 truncate">{principle.record_id}</dd>
            </div>
          </dl>
        </Section>
      </div>
    </div>
  );
}
