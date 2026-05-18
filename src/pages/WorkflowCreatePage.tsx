import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X, Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      const workflow = await api.post<WorkflowResponse>("/workflows", {
        title,
        objective,
        domain,
        tags,
      });
      await Promise.all([
        ...taskRecordIds.map((id) =>
          api.post(`/workflows/${workflow.id}/task-refs`, { task_record_id: id })
        ),
        ...principleRecordIds.map((id) =>
          api.post(`/workflows/${workflow.id}/principle-refs`, { principle_record_id: id })
        ),
      ]);
      if (submitAfter) {
        await api.post(`/workflows/${workflow.id}/submit`);
      }
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
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link
          to="/workflows"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Workflows
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">New workflow</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({ submitAfter: false });
        }}
        className="space-y-8"
      >
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
                placeholder="What does this workflow accomplish?"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="objective">
                Objective <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="The goal this workflow is designed to achieve"
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

            <TagInput
              label="Tags"
              values={tags}
              onChange={setTags}
              placeholder="e.g. security, networking"
            />
          </CardContent>
        </Card>

        {/* Task refs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Tasks</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTaskPickerOpen(true)}
              disabled={isPending || availableTasks.length === 0}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add task
            </Button>
          </CardHeader>
          <CardContent>
            {taskRecordIds.length === 0 ? (
              <p className="text-sm text-gray-400">No tasks attached.</p>
            ) : (
              <ol className="space-y-1">
                {taskRecordIds.map((id, i) => (
                  <li key={id} className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                    <span className="shrink-0 text-xs text-gray-400 w-4">{i + 1}.</span>
                    <span className="flex-1 text-sm text-gray-800 truncate">
                      {taskTitleMap.get(id) ?? <span className="font-mono text-xs text-gray-500">{id}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTaskRecordIds((prev) => prev.filter((x) => x !== id))}
                      disabled={isPending}
                      className="shrink-0 text-gray-400 hover:text-red-500 disabled:opacity-40"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
          <RefPickerDialog
            open={taskPickerOpen}
            onOpenChange={setTaskPickerOpen}
            title="Add task"
            items={availableTasks}
            onPick={(id) => setTaskRecordIds((prev) => [...prev, id])}
          />
        </Card>

        {/* Principle refs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Principles</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPrinciplePickerOpen(true)}
              disabled={isPending || availablePrinciples.length === 0}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add principle
            </Button>
          </CardHeader>
          <CardContent>
            {principleRecordIds.length === 0 ? (
              <p className="text-sm text-gray-400">No principles attached.</p>
            ) : (
              <ul className="space-y-1">
                {principleRecordIds.map((id) => (
                  <li key={id} className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                    <span className="flex-1 text-sm text-gray-800 truncate">
                      {principleTitleMap.get(id) ?? <span className="font-mono text-xs text-gray-500">{id}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPrincipleRecordIds((prev) => prev.filter((x) => x !== id))}
                      disabled={isPending}
                      className="shrink-0 text-gray-400 hover:text-red-500 disabled:opacity-40"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <RefPickerDialog
            open={principlePickerOpen}
            onOpenChange={setPrinciplePickerOpen}
            title="Add principle"
            items={availablePrinciples}
            onPick={(id) => setPrincipleRecordIds((prev) => [...prev, id])}
          />
        </Card>

        {errorMessage && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {errorMessage}
          </p>
        )}

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
          <Link to="/workflows" className="ml-auto text-sm text-gray-400 hover:text-gray-600">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
