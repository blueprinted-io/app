import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X, Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";
import { RefPickerDialog } from "@/components/RefPickerDialog";

interface WorkflowTaskRef {
  task_record_id: string;
  order_index: number;
}

interface WorkflowPrincipleRef {
  principle_record_id: string;
}

interface WorkflowDetail {
  id: string;
  record_id: string;
  version: number;
  status: string;
  title: string;
  objective: string;
  domain: string;
  tags: string[];
  task_refs: WorkflowTaskRef[];
  principle_refs: WorkflowPrincipleRef[];
}

interface TaskSummary {
  record_id: string;
  title: string;
  status: string;
}

interface PrincipleSummary {
  record_id: string;
  title: string;
  status: string;
}

const refItemStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  borderRadius: 8, border: "1px solid var(--bp-border)",
  background: "var(--bp-bg)", padding: "6px 10px",
};

export function WorkflowEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workflow, isLoading, error } = useQuery({
    queryKey: ["workflows", id],
    queryFn: () => api.get<WorkflowDetail>(`/workflows/${id}`),
    enabled: !!id,
  });

  const isDraft = workflow?.status === "draft";

  const { data: allTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<TaskSummary[]>("/tasks"),
    enabled: isDraft,
  });

  const { data: allPrinciples } = useQuery({
    queryKey: ["principles"],
    queryFn: () => api.get<PrincipleSummary[]>("/principles"),
    enabled: isDraft,
  });

  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [domain, setDomain] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [principlePickerOpen, setPrinciplePickerOpen] = useState(false);

  useEffect(() => {
    if (workflow) {
      setTitle(workflow.title);
      setObjective(workflow.objective);
      setDomain(workflow.domain);
      setTags(workflow.tags);
    }
  }, [workflow]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!workflow) throw new Error("Workflow not loaded");
      return api.patch<WorkflowDetail>(`/workflows/${workflow.id}`, {
        title: title.trim() || undefined,
        objective: objective.trim() || undefined,
        domain: domain.trim() || undefined,
        tags,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      navigate(`/workflows/${updated.id}`);
    },
  });

  function invalidateWorkflow() {
    queryClient.invalidateQueries({ queryKey: ["workflows", id] });
  }

  const addTaskRefMutation = useMutation({
    mutationFn: (taskRecordId: string) =>
      api.post(`/workflows/${workflow!.id}/task-refs`, { task_record_id: taskRecordId }),
    onSuccess: invalidateWorkflow,
  });

  const removeTaskRefMutation = useMutation({
    mutationFn: (taskRecordId: string) =>
      api.delete(`/workflows/${workflow!.id}/task-refs/${taskRecordId}`),
    onSuccess: invalidateWorkflow,
  });

  const addPrincipleRefMutation = useMutation({
    mutationFn: (principleRecordId: string) =>
      api.post(`/workflows/${workflow!.id}/principle-refs`, { principle_record_id: principleRecordId }),
    onSuccess: invalidateWorkflow,
  });

  const removePrincipleRefMutation = useMutation({
    mutationFn: (principleRecordId: string) =>
      api.delete(`/workflows/${workflow!.id}/principle-refs/${principleRecordId}`),
    onSuccess: invalidateWorkflow,
  });

  const canSave = title.trim() && objective.trim() && domain.trim();

  const currentTaskRecordIds = new Set(workflow?.task_refs.map((r) => r.task_record_id) ?? []);
  const currentPrincipleRecordIds = new Set(workflow?.principle_refs.map((r) => r.principle_record_id) ?? []);

  const availableTasks = (allTasks ?? [])
    .filter((t) => t.status === "confirmed" && !currentTaskRecordIds.has(t.record_id))
    .map((t) => ({ id: t.record_id, title: t.title }));

  const availablePrinciples = (allPrinciples ?? [])
    .filter((p) => p.status === "confirmed" && !currentPrincipleRecordIds.has(p.record_id))
    .map((p) => ({ id: p.record_id, title: p.title }));

  const taskTitleMap = new Map((allTasks ?? []).map((t) => [t.record_id, t.title]));
  const principleTitleMap = new Map((allPrinciples ?? []).map((p) => [p.record_id, p.title]));

  const anyRefPending =
    addTaskRefMutation.isPending ||
    removeTaskRefMutation.isPending ||
    addPrincipleRefMutation.isPending ||
    removePrincipleRefMutation.isPending;

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
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Workflow not found.</p>
        <Link to="/workflows" className="bp-link" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={14} /> Back to workflows
        </Link>
      </div>
    );
  }

  const saveError = saveMutation.error instanceof ApiError
    ? saveMutation.error.message
    : saveMutation.error
      ? "An unexpected error occurred."
      : null;

  const sortedTaskRefs = (workflow.task_refs ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="bp-page" style={{ maxWidth: 620 }}>
      <div className="bp-crumbs">
        <Link to={`/workflows/${workflow.id}`} className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Back to workflow
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <h1>Edit workflow</h1>
          <p className="bp-page__sub">v{workflow.version} · {workflow.status}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (canSave) saveMutation.mutate(); }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head"><h3>Details</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Label htmlFor="title">Title <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What does this workflow accomplish?" />
            </div>
            <div>
              <Label htmlFor="objective">Objective <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Textarea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="The goal this workflow is designed to achieve" rows={3} />
            </div>
            <div>
              <Label htmlFor="domain">Domain <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. infrastructure" />
            </div>
            <TagInput label="Tags" values={tags} onChange={setTags} placeholder="Tag — press Enter" />
          </div>
        </section>

        {/* Task refs */}
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head">
            <h3>Tasks</h3>
            {isDraft && (
              <button
                type="button"
                className="bp-btn bp-btn--ghost"
                style={{ fontSize: 12, padding: "3px 10px" }}
                onClick={() => setTaskPickerOpen(true)}
                disabled={anyRefPending || availableTasks.length === 0}
              >
                <Plus size={11} /> Add task
              </button>
            )}
          </div>
          {sortedTaskRefs.length === 0 ? (
            <p className="bp-muted" style={{ fontSize: 13 }}>No tasks attached.</p>
          ) : (
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {sortedTaskRefs.map((ref) => (
                <li key={ref.task_record_id} style={refItemStyle}>
                  <span style={{ fontSize: 11, color: "var(--bp-muted)", width: 18, flexShrink: 0 }}>{ref.order_index + 1}.</span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {taskTitleMap.get(ref.task_record_id) ?? <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{ref.task_record_id}</span>}
                  </span>
                  {isDraft && (
                    <button
                      type="button"
                      onClick={() => removeTaskRefMutation.mutate(ref.task_record_id)}
                      disabled={anyRefPending}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bp-muted)", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
          <RefPickerDialog open={taskPickerOpen} onOpenChange={setTaskPickerOpen} title="Add task" items={availableTasks} onPick={(id) => addTaskRefMutation.mutate(id)} />
        </section>

        {/* Principle refs */}
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head">
            <h3>Principles</h3>
            {isDraft && (
              <button
                type="button"
                className="bp-btn bp-btn--ghost"
                style={{ fontSize: 12, padding: "3px 10px" }}
                onClick={() => setPrinciplePickerOpen(true)}
                disabled={anyRefPending || availablePrinciples.length === 0}
              >
                <Plus size={11} /> Add principle
              </button>
            )}
          </div>
          {(workflow.principle_refs ?? []).length === 0 ? (
            <p className="bp-muted" style={{ fontSize: 13 }}>No principles attached.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {(workflow.principle_refs ?? []).map((ref) => (
                <li key={ref.principle_record_id} style={refItemStyle}>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {principleTitleMap.get(ref.principle_record_id) ?? <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{ref.principle_record_id}</span>}
                  </span>
                  {isDraft && (
                    <button
                      type="button"
                      onClick={() => removePrincipleRefMutation.mutate(ref.principle_record_id)}
                      disabled={anyRefPending}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bp-muted)", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <RefPickerDialog open={principlePickerOpen} onOpenChange={setPrinciplePickerOpen} title="Add principle" items={availablePrinciples} onPick={(id) => addPrincipleRefMutation.mutate(id)} />
        </section>

        {saveError && (
          <div style={{ fontSize: 13, color: "var(--bp-danger)", background: "color-mix(in oklab, var(--bp-danger) 8%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-danger) 25%, var(--bp-border))", borderRadius: 12, padding: "10px 14px" }}>
            {saveError}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="submit" className="bp-btn bp-btn--secondary" disabled={!canSave || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save changes"}
          </button>
          <button type="button" className="bp-btn bp-btn--ghost" onClick={() => navigate(`/workflows/${workflow.id}`)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
