import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskResponse {
  id: string;
  record_id: string;
  version: number;
}

interface StepDraft {
  _key: string;
  step: string;
  completion: string;
  notes: string;
  irreversible: boolean;
  actions: string[];
}

function emptyStep(): StepDraft {
  return {
    _key: crypto.randomUUID(),
    step: "",
    completion: "",
    notes: "",
    irreversible: false,
    actions: [""],
  };
}

// ---------------------------------------------------------------------------
// Step editor
// ---------------------------------------------------------------------------

const subLabelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, letterSpacing: ".06em",
  textTransform: "uppercase", color: "var(--bp-muted)", marginBottom: 4,
};

function StepEditor({
  step,
  index,
  onChange,
  onRemove,
}: {
  step: StepDraft;
  index: number;
  onChange: (next: StepDraft) => void;
  onRemove: () => void;
}) {
  function updateAction(i: number, value: string) {
    const next = [...step.actions];
    next[i] = value;
    onChange({ ...step, actions: next });
  }

  function addAction() {
    onChange({ ...step, actions: [...step.actions, ""] });
  }

  function removeAction(i: number) {
    onChange({ ...step, actions: step.actions.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="bp-card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--bp-muted)" }}>Step {index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bp-muted)", display: "inline-flex", alignItems: "center", padding: 2 }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <p style={subLabelStyle}>What is being done <span style={{ color: "var(--bp-danger)" }}>*</span></p>
          <Textarea
            value={step.step}
            onChange={(e) => onChange({ ...step, step: e.target.value })}
            placeholder="Describe the intent of this step"
            rows={2}
          />
        </div>

        <div>
          <p style={subLabelStyle}>Actions</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {step.actions.map((action, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Input
                  value={action}
                  onChange={(e) => updateAction(i, e.target.value)}
                  placeholder={`Action ${i + 1} — specific command or instruction`}
                />
                {step.actions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAction(i)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bp-muted)", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addAction}
            style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--bp-muted)", background: "none", border: "none", cursor: "pointer" }}
          >
            <Plus size={12} /> Add action
          </button>
        </div>

        <div>
          <p style={subLabelStyle}>Completion criterion <span style={{ color: "var(--bp-danger)" }}>*</span></p>
          <Textarea
            value={step.completion}
            onChange={(e) => onChange({ ...step, completion: e.target.value })}
            placeholder="Observable proof that this step is done"
            rows={2}
          />
        </div>

        <div>
          <p style={subLabelStyle}>Notes <span style={{ fontWeight: 400, color: "var(--bp-muted)" }}>(optional)</span></p>
          <Textarea
            value={step.notes}
            onChange={(e) => onChange({ ...step, notes: e.target.value })}
            placeholder="Alternatives, caveats, tool-choice guidance"
            rows={2}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--bp-ink)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={step.irreversible}
            onChange={(e) => onChange({ ...step, irreversible: e.target.checked })}
            style={{ accentColor: "var(--bp-accent)", width: 14, height: 14 }}
          />
          This step is irreversible
        </label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TaskCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [outcome, setOutcome] = useState("");
  const [domain, setDomain] = useState("");
  const [softwareName, setSoftwareName] = useState("");
  const [softwareVersion, setSoftwareVersion] = useState("");
  const [facts, setFacts] = useState<string[]>([]);
  const [concepts, setConcepts] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [steps, setSteps] = useState<StepDraft[]>([]);

  function updateStep(index: number, next: StepDraft) {
    setSteps((prev) => prev.map((s, i) => (i === index ? next : s)));
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  const mutation = useMutation({
    mutationFn: async ({ submitAfter }: { submitAfter: boolean }) => {
      const task = await api.post<TaskResponse>("/tasks", {
        title,
        outcome,
        domain,
        software_name: softwareName || null,
        software_version: softwareVersion || null,
        facts,
        concepts,
        tags,
      });

      for (const s of steps) {
        if (!s.step.trim() || !s.completion.trim()) continue;
        await api.post(`/tasks/${task.id}/steps`, {
          step: s.step.trim(),
          completion: s.completion.trim(),
          notes: s.notes.trim() || null,
          irreversible: s.irreversible,
          actions: s.actions
            .map((a) => ({ instruction: a.trim() }))
            .filter((a) => a.instruction),
        });
      }

      if (submitAfter) await api.post(`/tasks/${task.id}/submit`);
      return task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      navigate(`/tasks/${task.record_id}/${task.version}`);
    },
  });

  const isValid = title.trim() && outcome.trim() && domain.trim();
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
        <Link to="/tasks" className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Tasks
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <h1>New task</h1>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate({ submitAfter: false }); }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        {/* Core fields */}
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head"><h3>Details</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Label htmlFor="title">Title <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What does this task do?" required />
            </div>
            <div>
              <Label htmlFor="outcome">Outcome <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Textarea id="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="What is the end state when this task is complete?" rows={3} required />
            </div>
            <div>
              <Label htmlFor="domain">Domain <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. linux-sysadmin" required />
            </div>
            <div className="bp-grid-2" style={{ gap: 12 }}>
              <div>
                <Label htmlFor="software-name">Software</Label>
                <Input id="software-name" value={softwareName} onChange={(e) => setSoftwareName(e.target.value)} placeholder="e.g. nginx" />
              </div>
              <div>
                <Label htmlFor="software-version">Version</Label>
                <Input id="software-version" value={softwareVersion} onChange={(e) => setSoftwareVersion(e.target.value)} placeholder="e.g. 1.25" />
              </div>
            </div>
          </div>
        </section>

        {/* Knowledge */}
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head"><h3>Knowledge</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <TagInput label="Facts" values={facts} onChange={setFacts} placeholder="An atomic statement of truth — press Enter to add" />
            <TagInput label="Concepts" values={concepts} onChange={setConcepts} placeholder="Contextual knowledge explaining why this task exists" />
            <TagInput label="Tags" values={tags} onChange={setTags} placeholder="e.g. security, networking" />
          </div>
        </section>

        {/* Procedure */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--bp-ink)" }}>Procedure</span>
            <button
              type="button"
              onClick={() => setSteps((prev) => [...prev, emptyStep()])}
              className="bp-btn bp-btn--ghost"
              style={{ fontSize: 12 }}
            >
              <Plus size={12} /> Add step
            </button>
          </div>

          {steps.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", border: "1px dashed var(--bp-border)", borderRadius: 12 }}>
              <p className="bp-muted" style={{ fontSize: 13 }}>No steps yet. Steps can be added now or after saving.</p>
            </div>
          )}

          {steps.map((step, i) => (
            <StepEditor
              key={step._key}
              step={step}
              index={i}
              onChange={(next) => updateStep(i, next)}
              onRemove={() => removeStep(i)}
            />
          ))}
        </div>

        {errorMessage && (
          <div style={{ fontSize: 13, color: "var(--bp-danger)", background: "color-mix(in oklab, var(--bp-danger) 8%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-danger) 25%, var(--bp-border))", borderRadius: 12, padding: "10px 14px" }}>
            {errorMessage}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="submit" className="bp-btn bp-btn--ghost" disabled={!isValid || isPending}>
            {isPending ? "Saving…" : "Save as draft"}
          </button>
          <button
            type="button"
            className="bp-btn bp-btn--secondary"
            disabled={!isValid || isPending}
            onClick={() => mutation.mutate({ submitAfter: true })}
          >
            {isPending ? "Saving…" : "Save and submit"}
          </button>
          <Link to="/tasks" className="bp-link" style={{ marginLeft: "auto", fontSize: 13 }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
