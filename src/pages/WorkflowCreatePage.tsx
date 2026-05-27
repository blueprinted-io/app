import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X, Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";
import { RefPickerDialog } from "@/components/RefPickerDialog";

interface WorkflowResponse {
  id: string;
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

export function WorkflowCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [domain, setDomain] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [taskRecordIds, setTaskRecordIds] = useState<string[]>([]);
  const [principleRecordIds, setPrincipleRecordIds] = useState<string[]>([]);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [principlePickerOpen, setPrinciplePickerOpen] = useState(false);

  const { data: allTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<TaskSummary[]>("/tasks"),
  });

  const { data: allPrinciples } = useQuery({
    queryKey: ["principles"],
    queryFn: () => api.get<PrincipleSummary[]>("/principles"),
  });

  const confirmedTasks = (allTasks ?? []).filter((t) => t.status === "confirmed");
  const confirmedPrinciples = (allPrinciples ?? []).filter((p) => p.status === "confirmed");

  const taskTitleMap = new Map(confirmedTasks.map((t) => [t.record_id, t.title]));
  const principleTitleMap = new Map(confirmedPrinciples.map((p) => [p.record_id, p.title]));

  const availableTasks = confirmedTasks
    .filter((t) => !taskRecordIds.includes(t.record_id))
    .map((t) => ({ id: t.record_id, title: t.title }));

  const availablePrinciples = confirmedPrinciples
    .filter((p) => !principleRecordIds.includes(p.record_id))
    .map((p) => ({ id: p.record_id, title: p.title }));

  const mutation = useMutation({
    mutationFn: async ({ submitAfter }: { submitAfter: boolean }) => {
      const workflow = await api.post<WorkflowResponse>("/workflows", { title, objective, domain, tags });
      await Promise.all([
        ...taskRecordIds.map((id) => api.post(`/workflows/${workflow.id}/task-refs`, { task_record_id: id })),
        ...principleRecordIds.map((id) => api.post(`/workflows/${workflow.id}/principle-refs`, { principle_record_id: id })),
      ]);
      if (submitAfter) await api.post(`/workflows/${workflow.id}/submit`);
      return workflow;
    },
    onSuccess: (workflow, { submitAfter }) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      navigate(submitAfter ? `/workflows/${workflow.id}` : `/workflows/${workflow.id}/edit`);
    },
  });

  const isValid = title.trim() && objective.trim() && domain.trim();
  const isPending = mutation.isPending;

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "An unexpected error occurred."
        : null;

  return (
    <div className="bp-page" style={{ maxWidth: 720 }}>
      <div className="bp-crumbs">
        <Link to="/workflows" className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Workflows
        </Link>
      </div>

      <div className="bp-page__head">
        <div><h1>New workflow</h1></div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate({ submitAfter: false }); }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head"><h3>Details</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Label htmlFor="title">Title <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What does this workflow accomplish?" required />
            </div>
            <div>
              <Label htmlFor="objective">Objective <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Textarea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="The goal this workflow is designed to achieve" rows={3} required />
            </div>
            <div>
              <Label htmlFor="domain">Domain <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. linux-sysadmin" required />
            </div>
            <TagInput label="Tags" values={tags} onChange={setTags} placeholder="e.g. security, networking" />
          </div>
        </section>

        {/* Task refs */}
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head">
            <h3>Tasks</h3>
            <button
              type="button"
              className="bp-btn bp-btn--ghost"
              style={{ fontSize: 12, padding: "3px 10px" }}
              onClick={() => setTaskPickerOpen(true)}
              disabled={isPending || availableTasks.length === 0}
            >
              <Plus size={11} /> Add task
            </button>
          </div>
          {taskRecordIds.length === 0 ? (
            <p className="bp-muted" style={{ fontSize: 13 }}>No tasks attached.</p>
          ) : (
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {taskRecordIds.map((id, i) => (
                <li key={id} style={refItemStyle}>
                  <span style={{ fontSize: 11, color: "var(--bp-muted)", width: 18, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {taskTitleMap.get(id) ?? <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{id}</span>}
                  </span>
                  <button type="button" onClick={() => setTaskRecordIds((prev) => prev.filter((x) => x !== id))} disabled={isPending}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bp-muted)", display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ol>
          )}
          <RefPickerDialog open={taskPickerOpen} onOpenChange={setTaskPickerOpen} title="Add task" items={availableTasks} onPick={(id) => setTaskRecordIds((prev) => [...prev, id])} />
        </section>

        {/* Principle refs */}
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head">
            <h3>Principles</h3>
            <button
              type="button"
              className="bp-btn bp-btn--ghost"
              style={{ fontSize: 12, padding: "3px 10px" }}
              onClick={() => setPrinciplePickerOpen(true)}
              disabled={isPending || availablePrinciples.length === 0}
            >
              <Plus size={11} /> Add principle
            </button>
          </div>
          {principleRecordIds.length === 0 ? (
            <p className="bp-muted" style={{ fontSize: 13 }}>No principles attached.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {principleRecordIds.map((id) => (
                <li key={id} style={refItemStyle}>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {principleTitleMap.get(id) ?? <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{id}</span>}
                  </span>
                  <button type="button" onClick={() => setPrincipleRecordIds((prev) => prev.filter((x) => x !== id))} disabled={isPending}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bp-muted)", display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <RefPickerDialog open={principlePickerOpen} onOpenChange={setPrinciplePickerOpen} title="Add principle" items={availablePrinciples} onPick={(id) => setPrincipleRecordIds((prev) => [...prev, id])} />
        </section>

        {errorMessage && (
          <div style={{ fontSize: 13, color: "var(--bp-danger)", background: "color-mix(in oklab, var(--bp-danger) 8%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-danger) 25%, var(--bp-border))", borderRadius: 12, padding: "10px 14px" }}>
            {errorMessage}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="submit" className="bp-btn bp-btn--ghost" disabled={!isValid || isPending}>
            {isPending ? "Saving…" : "Save as draft"}
          </button>
          <button type="button" className="bp-btn bp-btn--secondary" disabled={!isValid || isPending} onClick={() => mutation.mutate({ submitAfter: true })}>
            {isPending ? "Saving…" : "Save and submit"}
          </button>
          <Link to="/workflows" className="bp-link" style={{ marginLeft: "auto", fontSize: 13 }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
