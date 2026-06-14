import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { ReturnDialog } from "@/components/ReturnDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskStepAction {
  id: string;
  order_index: number;
  instruction: string;
}

interface TaskStepImage {
  id: string;
  order_index: number;
  storage_path: string;
  caption: string | null;
}

interface TaskStep {
  id: string;
  order_index: number;
  step: string;
  completion: string;
  notes: string | null;
  irreversible: boolean;
  actions: TaskStepAction[];
  images: TaskStepImage[];
}

interface TaskVersionSummary {
  id: string;
  version: number;
  status: string;
}

interface CurrentUser {
  id: string;
}

interface TaskDetail {
  id: string;
  record_id: string;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  title: string;
  outcome: string;
  domain: string;
  software_name: string | null;
  software_version: string | null;
  media_url: string | null;
  facts: string[];
  concepts: string[];
  tags: string[];
  steps: TaskStep[];
  irreversible: boolean;
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

const stepNumStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26, borderRadius: 999,
  background: "color-mix(in oklab, var(--bp-accent) 15%, var(--bp-bg))",
  color: "var(--bp-accent-deep)", fontWeight: 800, fontSize: 12, flexShrink: 0,
};

const subLabelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, letterSpacing: ".06em",
  textTransform: "uppercase", color: "var(--bp-muted)", marginBottom: 6,
};

function StepCard({ step, index }: { step: TaskStep; index: number }) {
  return (
    <div className="bp-card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={stepNumStyle}>{index + 1}</span>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <p style={{ fontWeight: 600, fontSize: 14, color: "var(--bp-ink)", margin: 0 }}>{step.step}</p>
            {step.irreversible && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--bp-warn)", flexShrink: 0 }}>
                <AlertTriangle size={12} />
                Irreversible
              </span>
            )}
          </div>

          {step.actions.length > 0 && (
            <div>
              <p style={subLabelStyle}>How</p>
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {step.actions.map((a) => (
                  <li key={a.id} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--bp-ink)" }}>
                    <span style={{ color: "var(--bp-muted)", flexShrink: 0 }}>{a.order_index + 1}.</span>
                    <code style={{ fontFamily: "ui-monospace, monospace", background: "none", border: "none", padding: 0, fontSize: 13 }}>{a.instruction}</code>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {step.notes && (
            <div style={{ background: "color-mix(in oklab, var(--bp-accent-blue) 8%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-accent-blue) 20%, var(--bp-border))", borderRadius: 8, padding: "8px 12px" }}>
              <p style={{ ...subLabelStyle, color: "var(--bp-accent-blue)" }}>Note</p>
              <p style={{ fontSize: 13, margin: 0, color: "var(--bp-ink)" }}>{step.notes}</p>
            </div>
          )}

          <div style={{ background: "color-mix(in oklab, var(--bp-ok) 8%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-ok) 22%, var(--bp-border))", borderRadius: 8, padding: "8px 12px" }}>
            <p style={{ ...subLabelStyle, color: "var(--bp-ok)" }}>Done when</p>
            <p style={{ fontSize: 13, margin: 0, color: "var(--bp-ink)" }}>{step.completion}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TaskDetailPage() {
  const { recordId, version } = useParams<{ recordId: string; version: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);

  const { data: task, isLoading, error } = useQuery({
    queryKey: ["tasks", recordId, version],
    queryFn: () => api.get<TaskDetail>(`/tasks/${recordId}/${version}`),
    enabled: !!recordId && !!version,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<CurrentUser>("/users/me"),
  });

  function onSuccess() {
    queryClient.invalidateQueries({ queryKey: ["tasks", recordId, version] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["review-queue"] });
  }

  const { data: versions } = useQuery({
    queryKey: ["tasks", recordId, "versions"],
    queryFn: () => api.get<TaskVersionSummary[]>(`/tasks/${recordId}/versions`),
    enabled: !!recordId,
  });

  const { data: queue } = useQuery({
    queryKey: ["review-queue"],
    queryFn: () => api.get<{ items: { id: string; claim: { claimed_by: string } | null }[] }>("/review/queue"),
    enabled: task?.status === "submitted",
  });

  const activeClaim = queue?.items.find((i) => i.id === task?.id)?.claim ?? null;
  const claimHeldByMe = !!currentUser && activeClaim?.claimed_by === currentUser.id;

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/tasks/${task!.id}/submit`),
    onSuccess,
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post(`/tasks/${task!.id}/confirm`),
    onSuccess,
  });

  const returnMutation = useMutation({
    mutationFn: (note: string) => api.post(`/tasks/${task!.id}/return`, { note }),
    onSuccess: () => { setReturnDialogOpen(false); onSuccess(); },
  });

  const releaseMutation = useMutation({
    mutationFn: () => api.post(`/review/tasks/${task!.id}/release`),
    onSuccess,
  });

  const reviseMutation = useMutation({
    mutationFn: (note?: string) =>
      api.post<TaskDetail>(`/tasks/${recordId}/${version}/revise`, note ? { note } : {}),
    onSuccess: (newTask) => {
      setReviseDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      navigate(`/tasks/${newTask.record_id}/${newTask.version}/edit`);
    },
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

  const isSelf = !!currentUser && !!task && currentUser.id === task.created_by;
  const anyPending =
    submitMutation.isPending ||
    confirmMutation.isPending ||
    returnMutation.isPending ||
    releaseMutation.isPending ||
    reviseMutation.isPending;

  if (isLoading) {
    return (
      <div className="bp-page">
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading task…</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="bp-page">
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Task not found or failed to load.</p>
        <Link to="/tasks" className="bp-link" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={14} /> Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="bp-page" style={{ maxWidth: 820 }}>

      {/* Breadcrumb */}
      <div className="bp-crumbs">
        <Link to="/tasks" className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Tasks
        </Link>
        <span className="bp-crumbs__sep">·</span>
        <span className="bp-crumbs__current">{task.title}</span>
      </div>

      {/* Page head */}
      <div className="bp-page__head">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <StatusBadge status={task.status} />
            <span className="bp-muted" style={{ fontSize: 12 }}>v{task.version}</span>
            {task.irreversible && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--bp-warn)" }}>
                <AlertTriangle size={12} /> Contains irreversible steps
              </span>
            )}
          </div>
          <h1>{task.title}</h1>
          <p className="bp-page__sub">
            {task.domain}
            {task.software_name && ` · ${task.software_name}${task.software_version ? ` ${task.software_version}` : ""}`}
            {" · "}Updated {formatDate(task.updated_at)}
          </p>
        </div>
        <div className="bp-page__actions">
          {task.status === "draft" && isSelf && (
            <Link to={`/tasks/${recordId}/${version}/edit`} className="bp-btn bp-btn--ghost">
              Edit
            </Link>
          )}
          {task.status === "draft" && isSelf && (
            <button className="bp-btn bp-btn--secondary" onClick={() => submitMutation.mutate()} disabled={anyPending}>
              {submitMutation.isPending ? "Submitting…" : "Submit for review"}
            </button>
          )}
          {task.status === "submitted" && !isSelf && (
            <button className="bp-btn bp-btn--secondary" onClick={() => confirmMutation.mutate()} disabled={anyPending}>
              {confirmMutation.isPending ? "Confirming…" : "Confirm"}
            </button>
          )}
          {task.status === "submitted" && (
            <button className="bp-btn bp-btn--ghost" onClick={() => setReturnDialogOpen(true)} disabled={anyPending}>
              Return
            </button>
          )}
          {task.status !== "draft" && (
            <button
              className="bp-btn bp-btn--ghost"
              onClick={() => task.status === "returned" ? reviseMutation.mutate(undefined) : setReviseDialogOpen(true)}
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
        title="Revise task"
        noteLabel="Reason for revision"
        placeholder="Explain why this task needs to be revised…"
        confirmLabel="Create draft"
        pendingLabel="Creating draft…"
      />

      {isSelf && task.status === "submitted" && (
        <p className="bp-muted" style={{ fontSize: 12 }}>You cannot confirm your own submission.</p>
      )}

      {/* Version history */}
      {versions && versions.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span className="bp-muted">Versions:</span>
          {versions.map((v) => {
            const isCurrent = v.version === task.version;
            return isCurrent ? (
              <span key={v.version} style={{ padding: "2px 8px", borderRadius: 6, background: "color-mix(in oklab, var(--bp-accent) 15%, var(--bp-bg))", fontWeight: 700, fontSize: 12, color: "var(--bp-accent-deep)" }}>
                v{v.version}
              </span>
            ) : (
              <Link key={v.version} to={`/tasks/${recordId}/${v.version}`} className="bp-muted" style={{ padding: "2px 8px", borderRadius: 6, fontSize: 12 }}>
                v{v.version} <span style={{ opacity: .6 }}>({v.status})</span>
              </Link>
            );
          })}
          {task.version > 1 && (
            <Link to={`/tasks/${recordId}/${task.version}/diff`} className="bp-muted" style={{ marginLeft: 4, fontSize: 12 }}>
              View changes
            </Link>
          )}
        </div>
      )}

      {/* Change note */}
      {task.change_note && (
        <div style={{ background: "color-mix(in oklab, var(--bp-accent) 10%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-accent) 35%, var(--bp-border))", borderRadius: 12, padding: "10px 14px" }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--bp-warn)", marginBottom: 4 }}>
            {task.status === "returned" ? "Return note" : "Revision note"}
          </p>
          <p style={{ fontSize: 13, margin: 0, color: "var(--bp-ink)" }}>{task.change_note}</p>
        </div>
      )}

      {actionErrorMessage && (
        <div style={{ fontSize: 13, color: "var(--bp-danger)", background: "color-mix(in oklab, var(--bp-danger) 8%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-danger) 25%, var(--bp-border))", borderRadius: 12, padding: "10px 14px" }}>
          {actionErrorMessage}
        </div>
      )}

      {/* Content sections */}
      <Section title="Outcome">
        <p style={{ fontSize: 14, color: "var(--bp-ink)", margin: 0 }}>{task.outcome}</p>
      </Section>

      {task.facts.length > 0 && (
        <Section title="Facts">
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {task.facts.map((fact, i) => (
              <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--bp-ink)" }}>
                <span className="bp-muted">·</span>{fact}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {task.concepts.length > 0 && (
        <Section title="Concepts">
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {task.concepts.map((concept, i) => (
              <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--bp-ink)" }}>
                <span className="bp-muted">·</span>{concept}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {task.steps.length > 0 && (
        <Section title={`Procedure · ${task.steps.length} step${task.steps.length === 1 ? "" : "s"}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {task.steps
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((step, i) => (
                <StepCard key={step.id} step={step} index={i} />
              ))}
          </div>
        </Section>
      )}

      {task.tags.length > 0 && (
        <Section title="Tags">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {task.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        </Section>
      )}

      <Section title="Details">
        <dl className="bp-grid-2" style={{ gap: "8px 32px" }}>
          {[
            ["Created", formatDate(task.created_at)],
            ["Last updated", formatDate(task.updated_at)],
            ["Version", `v${task.version}`],
            ["Record ID", task.record_id],
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
