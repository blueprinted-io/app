import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
// Tag input — type a value and press Enter to add, click × to remove
// ---------------------------------------------------------------------------

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? "Type and press Enter"}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step editor
// ---------------------------------------------------------------------------

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
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-700">
            Step {index + 1}
          </CardTitle>
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-300 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>What is being done <span className="text-red-500">*</span></Label>
          <Textarea
            value={step.step}
            onChange={(e) => onChange({ ...step, step: e.target.value })}
            placeholder="Describe the intent of this step"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Actions</Label>
          <div className="space-y-2">
            {step.actions.map((action, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={action}
                  onChange={(e) => updateAction(i, e.target.value)}
                  placeholder={`Action ${i + 1} — specific command or instruction`}
                />
                {step.actions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAction(i)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addAction}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1"
          >
            <Plus className="h-3 w-3" /> Add action
          </button>
        </div>

        <div className="space-y-1.5">
          <Label>Completion criterion <span className="text-red-500">*</span></Label>
          <Textarea
            value={step.completion}
            onChange={(e) => onChange({ ...step, completion: e.target.value })}
            placeholder="Observable proof that this step is done"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Textarea
            value={step.notes}
            onChange={(e) => onChange({ ...step, notes: e.target.value })}
            placeholder="Alternatives, caveats, tool-choice guidance"
            rows={2}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={step.irreversible}
            onChange={(e) => onChange({ ...step, irreversible: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-brand-amber"
          />
          This step is irreversible
        </label>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TaskCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Core fields
  const [title, setTitle] = useState("");
  const [outcome, setOutcome] = useState("");
  const [domain, setDomain] = useState("");
  const [softwareName, setSoftwareName] = useState("");
  const [softwareVersion, setSoftwareVersion] = useState("");

  // Array fields
  const [facts, setFacts] = useState<string[]>([]);
  const [concepts, setConcepts] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Steps
  const [steps, setSteps] = useState<StepDraft[]>([]);

  function updateStep(index: number, next: StepDraft) {
    setSteps((prev) => prev.map((s, i) => (i === index ? next : s)));
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  const mutation = useMutation({
    mutationFn: async ({ submitAfter }: { submitAfter: boolean }) => {
      // 1. Create the task
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

      // 2. Add steps in order
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

      // 3. Submit if requested
      if (submitAfter) {
        await api.post(`/tasks/${task.id}/submit`);
      }

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
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Tasks
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">New task</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({ submitAfter: false });
        }}
        className="space-y-8"
      >
        {/* Core fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What does this task do?"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outcome">
                Outcome <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="What is the end state when this task is complete?"
                rows={3}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="domain">
                Domain <span className="text-red-500">*</span>
              </Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. linux-sysadmin"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="software-name">Software</Label>
                <Input
                  id="software-name"
                  value={softwareName}
                  onChange={(e) => setSoftwareName(e.target.value)}
                  placeholder="e.g. nginx"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="software-version">Version</Label>
                <Input
                  id="software-version"
                  value={softwareVersion}
                  onChange={(e) => setSoftwareVersion(e.target.value)}
                  placeholder="e.g. 1.25"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Facts, concepts, tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Knowledge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <TagInput
              label="Facts"
              values={facts}
              onChange={setFacts}
              placeholder="An atomic statement of truth — press Enter to add"
            />
            <TagInput
              label="Concepts"
              values={concepts}
              onChange={setConcepts}
              placeholder="Contextual knowledge explaining why this task exists"
            />
            <TagInput
              label="Tags"
              values={tags}
              onChange={setTags}
              placeholder="e.g. security, networking"
            />
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Procedure</h2>
            <button
              type="button"
              onClick={() => setSteps((prev) => [...prev, emptyStep()])}
              className="inline-flex items-center gap-1.5 text-sm text-brand-amber hover:text-amber-600 font-medium"
            >
              <Plus className="h-4 w-4" />
              Add step
            </button>
          </div>

          {steps.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">
              No steps yet. Steps can be added now or after saving.
            </p>
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

        {/* Error */}
        {errorMessage && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {errorMessage}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="outline" disabled={!isValid || isPending}>
            {isPending ? "Saving…" : "Save as draft"}
          </Button>
          <Button
            type="button"
            disabled={!isValid || isPending}
            onClick={() => mutation.mutate({ submitAfter: true })}
          >
            {isPending ? "Saving…" : "Save and submit"}
          </Button>
          <Link
            to="/tasks"
            className="ml-auto text-sm text-gray-400 hover:text-gray-600"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
