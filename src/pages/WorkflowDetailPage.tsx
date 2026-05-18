import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ReturnDialog } from "@/components/ReturnDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkflowTaskRef {
  task_record_id: string;
  order_index: number;
}

interface WorkflowPrincipleRef {
  principle_record_id: string;
  attached_at: string;
  attached_by: string;
}

interface CurrentUser {
  id: string;
}

interface WorkflowVersionSummary {
  id: string;
  version: number;
  status: string;
}

interface WorkflowDetail {
  id: string;
  record_id: string;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  title: string;
  objective: string;
  domain: string;
  tags: string[];
  has_incoming_task_change: boolean;
  has_pending_task_confirm: boolean;
  task_refs: WorkflowTaskRef[];
  principle_refs: WorkflowPrincipleRef[];
  change_note: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  submitted: "secondary",
  confirmed: "default",
  returned: "destructive",
  deprecated: "outline",
  retired: "outline",
};

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

export function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);

  const { data: workflow, isLoading, error } = useQuery({
    queryKey: ["workflows", id],
    queryFn: () => api.get<WorkflowDetail>(`/workflows/${id}`),
    enabled: !!id,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<CurrentUser>("/users/me"),
  });

  function onSuccess() {
    queryClient.invalidateQueries({ queryKey: ["workflows", id] });
    queryClient.invalidateQueries({ queryKey: ["workflows"] });
    queryClient.invalidateQueries({ queryKey: ["review-queue"] });
  }

  const { data: queue } = useQuery({
    queryKey: ["review-queue"],
    queryFn: () => api.get<{ items: { id: string; claim: { claimed_by: string } | null }[] }>("/review/queue"),
    enabled: workflow?.status === "submitted",
  });

  const activeClaim = queue?.items.find((i) => i.id === workflow?.id)?.claim ?? null;
  const claimHeldByMe = !!currentUser && activeClaim?.claimed_by === currentUser.id;

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/workflows/${workflow!.id}/submit`),
    onSuccess,
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post(`/workflows/${workflow!.id}/confirm`),
    onSuccess,
  });

  const returnMutation = useMutation({
    mutationFn: (note: string) => api.post(`/workflows/${workflow!.id}/return`, { note }),
    onSuccess: () => { setReturnDialogOpen(false); onSuccess(); },
  });

  const releaseMutation = useMutation({
    mutationFn: () => api.post(`/review/workflows/${workflow!.id}/release`),
    onSuccess,
  });

  const reviseMutation = useMutation({
    mutationFn: (note?: string) =>
      api.post<WorkflowDetail>(`/workflows/${workflow!.id}/revise`, note ? { note } : {}),
    onSuccess: (newWorkflow) => {
      setReviseDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      navigate(`/workflows/${newWorkflow.id}/edit`);
    },
  });

  const { data: versions } = useQuery({
    queryKey: ["workflows", id, "versions"],
    queryFn: () => api.get<WorkflowVersionSummary[]>(`/workflows/${workflow!.record_id}/versions`),
    enabled: !!workflow,
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

  const isSelf = !!currentUser && !!workflow && currentUser.id === workflow.created_by;
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
        Loading workflow…
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Workflow not found or failed to load.</p>
        <Link to="/workflows" className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to workflows
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link
        to="/workflows"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Workflows
      </Link>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant={STATUS_VARIANT[workflow.status] ?? "outline"}>{workflow.status}</Badge>
          <span className="text-sm text-gray-400">v{workflow.version}</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{workflow.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>{workflow.domain}</span>
          <span>Updated {formatDate(workflow.updated_at)}</span>
        </div>
      </div>

      {/* Version history */}
      {versions && versions.length > 1 && (
        <div className="mb-6 flex items-center gap-2 text-sm">
          <span className="text-gray-400">Versions:</span>
          {versions.map((v) => {
            const isCurrent = v.id === workflow.id;
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
                to={`/workflows/${v.id}`}
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
      {workflow.status === "draft" && isSelf && (
        <div className="mb-8 flex items-center gap-3">
          <Button onClick={() => submitMutation.mutate()} disabled={anyPending}>
            {submitMutation.isPending ? "Submitting…" : "Submit for review"}
          </Button>
        </div>
      )}

      {workflow.status === "submitted" && (
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

      {workflow.change_note && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">
            {workflow.status === "returned" ? "Return note" : "Revision note"}
          </p>
          <p className="text-sm text-amber-900">{workflow.change_note}</p>
        </div>
      )}

      <div className="mb-8 flex items-center gap-3">
        {workflow.status === "draft" && isSelf ? (
          <Link to={`/workflows/${workflow.id}/edit`} className={buttonVariants({ variant: "outline" })}>
            Edit workflow
          </Link>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => {
                if (workflow.status === "returned") {
                  reviseMutation.mutate(undefined);
                } else {
                  setReviseDialogOpen(true);
                }
              }}
              disabled={anyPending}
            >
              {reviseMutation.isPending ? "Creating draft…" : "Revise workflow"}
            </Button>
            <ReturnDialog
              open={reviseDialogOpen}
              onOpenChange={setReviseDialogOpen}
              onConfirm={(note) => reviseMutation.mutate(note)}
              isPending={reviseMutation.isPending}
              title="Revise workflow"
              noteLabel="Reason for revision"
              placeholder="Explain why this workflow needs to be revised…"
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
        <Section title="Objective">
          <p className="text-gray-700">{workflow.objective}</p>
        </Section>

        {workflow.task_refs.length > 0 && (
          <Section title={`Tasks (${workflow.task_refs.length})`}>
            <ol className="space-y-2">
              {workflow.task_refs
                .slice()
                .sort((a, b) => a.order_index - b.order_index)
                .map((ref) => (
                  <li key={ref.task_record_id} className="flex gap-2 text-sm">
                    <span className="shrink-0 text-gray-400">{ref.order_index + 1}.</span>
                    <Link
                      to={`/tasks/${ref.task_record_id}/1`}
                      className="font-mono text-xs text-gray-600 hover:text-brand-amber"
                    >
                      {ref.task_record_id}
                    </Link>
                  </li>
                ))}
            </ol>
          </Section>
        )}

        {workflow.principle_refs.length > 0 && (
          <Section title={`Principles (${workflow.principle_refs.length})`}>
            <ul className="space-y-2">
              {workflow.principle_refs.map((ref) => (
                <li key={ref.principle_record_id} className="text-sm">
                  <Link
                    to={`/principles/${ref.principle_record_id}`}
                    className="font-mono text-xs text-gray-600 hover:text-brand-amber"
                  >
                    {ref.principle_record_id}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {workflow.tags.length > 0 && (
          <Section title="Tags">
            <div className="flex flex-wrap gap-2">
              {workflow.tags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </Section>
        )}

        <Section title="Details">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-400">Created</dt>
              <dd className="text-gray-700">{formatDate(workflow.created_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Last updated</dt>
              <dd className="text-gray-700">{formatDate(workflow.updated_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Version</dt>
              <dd className="text-gray-700">v{workflow.version}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Record ID</dt>
              <dd className="font-mono text-xs text-gray-500 truncate">{workflow.record_id}</dd>
            </div>
          </dl>
        </Section>
      </div>
    </div>
  );
}
