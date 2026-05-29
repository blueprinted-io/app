import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
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
    <section className="bp-card" style={{ padding: 18 }}>
      <div className="bp-section-head">
        <h3>{title}</h3>
      </div>
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
      <div className="bp-page">
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading workflow…</p>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="bp-page">
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Workflow not found or failed to load.</p>
        <Link to="/workflows" className="bp-link" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={14} /> Back to workflows
        </Link>
      </div>
    );
  }

  return (
    <div className="bp-page" style={{ maxWidth: 820 }}>

      {/* Breadcrumb */}
      <div className="bp-crumbs">
        <Link to="/workflows" className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Workflows
        </Link>
        <span className="bp-crumbs__sep">·</span>
        <span className="bp-crumbs__current">{workflow.title}</span>
      </div>

      {/* Page head */}
      <div className="bp-page__head">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <StatusBadge status={workflow.status} />
            <span className="bp-muted" style={{ fontSize: 12 }}>v{workflow.version}</span>
          </div>
          <h1>{workflow.title}</h1>
          <p className="bp-page__sub">
            {workflow.domain}
            {" · "}Updated {formatDate(workflow.updated_at)}
          </p>
        </div>
        <div className="bp-page__actions">
          {workflow.status === "draft" && isSelf && (
            <Link to={`/workflows/${workflow.id}/edit`} className="bp-btn bp-btn--ghost">
              Edit
            </Link>
          )}
          {workflow.status === "draft" && isSelf && (
            <button className="bp-btn bp-btn--secondary" onClick={() => submitMutation.mutate()} disabled={anyPending}>
              {submitMutation.isPending ? "Submitting…" : "Submit for review"}
            </button>
          )}
          {workflow.status === "submitted" && !isSelf && (
            <button className="bp-btn bp-btn--secondary" onClick={() => confirmMutation.mutate()} disabled={anyPending}>
              {confirmMutation.isPending ? "Confirming…" : "Confirm"}
            </button>
          )}
          {workflow.status === "submitted" && (
            <button className="bp-btn bp-btn--ghost" onClick={() => setReturnDialogOpen(true)} disabled={anyPending}>
              Return
            </button>
          )}
          {workflow.status !== "draft" && (
            <button
              className="bp-btn bp-btn--ghost"
              onClick={() => workflow.status === "returned" ? reviseMutation.mutate(undefined) : setReviseDialogOpen(true)}
              disabled={anyPending}
            >
              {reviseMutation.isPending ? "Creating draft…" : "Revise"}
            </button>
          )}
          {claimHeldByMe && (
            <button className="bp-btn bp-btn--ghost" onClick={() => releaseMutation.mutate()} disabled={anyPending}>
              {releaseMutation.isPending ? "Releasing…" : "Release claim"}
            </button>
          )}
        </div>
      </div>

      <ReturnDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        onConfirm={(note) => returnMutation.mutate(note)}
        isPending={returnMutation.isPending}
      />
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

      {isSelf && workflow.status === "submitted" && (
        <p className="bp-muted" style={{ fontSize: 12 }}>You cannot confirm your own submission.</p>
      )}

      {/* Version history */}
      {versions && versions.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span className="bp-muted">Versions:</span>
          {versions.map((v) => {
            const isCurrent = v.id === workflow.id;
            return isCurrent ? (
              <span key={v.id} style={{ padding: "2px 8px", borderRadius: 6, background: "color-mix(in oklab, var(--bp-accent) 15%, var(--bp-bg))", fontWeight: 700, fontSize: 12, color: "var(--bp-accent-deep)" }}>
                v{v.version}
              </span>
            ) : (
              <Link key={v.id} to={`/workflows/${v.id}`} className="bp-muted" style={{ padding: "2px 8px", borderRadius: 6, fontSize: 12 }}>
                v{v.version} <span style={{ opacity: .6 }}>({v.status})</span>
              </Link>
            );
          })}
          {workflow.version > 1 && (
            <Link to={`/workflows/${workflow.id}/diff`} className="bp-muted" style={{ marginLeft: 4, fontSize: 12 }}>
              View changes
            </Link>
          )}
        </div>
      )}

      {/* Change note */}
      {workflow.change_note && (
        <div style={{ background: "color-mix(in oklab, var(--bp-accent) 10%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-accent) 35%, var(--bp-border))", borderRadius: 12, padding: "10px 14px" }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--bp-warn)", marginBottom: 4 }}>
            {workflow.status === "returned" ? "Return note" : "Revision note"}
          </p>
          <p style={{ fontSize: 13, margin: 0, color: "var(--bp-ink)" }}>{workflow.change_note}</p>
        </div>
      )}

      {actionErrorMessage && (
        <div style={{ fontSize: 13, color: "var(--bp-danger)", background: "color-mix(in oklab, var(--bp-danger) 8%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-danger) 25%, var(--bp-border))", borderRadius: 12, padding: "10px 14px" }}>
          {actionErrorMessage}
        </div>
      )}

      {/* Content sections */}
      <Section title="Objective">
        <p style={{ fontSize: 14, color: "var(--bp-ink)", margin: 0 }}>{workflow.objective}</p>
      </Section>

      {workflow.task_refs.length > 0 && (
        <Section title={`Tasks · ${workflow.task_refs.length}`}>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {workflow.task_refs
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((ref) => (
                <li key={ref.task_record_id} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--bp-ink)" }}>
                  <span className="bp-muted">{ref.order_index + 1}.</span>
                  <Link
                    to={`/tasks/${ref.task_record_id}/1`}
                    className="bp-link"
                    style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
                  >
                    {ref.task_record_id}
                  </Link>
                </li>
              ))}
          </ol>
        </Section>
      )}

      {workflow.principle_refs.length > 0 && (
        <Section title={`Principles · ${workflow.principle_refs.length}`}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {workflow.principle_refs.map((ref) => (
              <li key={ref.principle_record_id} style={{ fontSize: 13 }}>
                <Link
                  to={`/principles/${ref.principle_record_id}`}
                  className="bp-link"
                  style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {workflow.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        </Section>
      )}

      <Section title="Details">
        <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 32px" }}>
          {[
            ["Created", formatDate(workflow.created_at)],
            ["Last updated", formatDate(workflow.updated_at)],
            ["Version", `v${workflow.version}`],
            ["Record ID", workflow.record_id],
          ].map(([label, value]) => (
            <div key={label}>
              <dt style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--bp-muted)", marginBottom: 2 }}>{label}</dt>
              <dd style={{ fontSize: 13, color: "var(--bp-ink)", fontFamily: label === "Record ID" ? "ui-monospace, monospace" : "inherit", wordBreak: "break-all" }}>{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
