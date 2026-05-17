import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TaskDetail {
  id: string;
  record_id: string;
  version: number;
  status: string;
  title: string;
  outcome: string;
  domain: string;
  software_name: string | null;
  software_version: string | null;
  media_url: string | null;
  facts: string[];
  concepts: string[];
  tags: string[];
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
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setDraft("");
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "Type and press Enter"}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="text-gray-400 hover:text-gray-600">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskEditPage() {
  const { taskId, recordId, version } = useParams<{ taskId?: string; recordId?: string; version?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Determine which API endpoint to use based on route parameters
  const taskQuery = useQuery({
    queryKey: taskId
      ? ["tasks", "by-id", taskId]
      : recordId && version
        ? ["tasks", recordId, version]
        : [],
    queryFn: () => taskId
      ? api.get<TaskDetail>(`/tasks/${taskId}`)
      : recordId && version
        ? api.get<TaskDetail>(`/tasks/${recordId}/${version}`)
        : Promise.reject(new Error("Invalid route parameters")),
    enabled: !!(taskId || (recordId && version)),
  });

  const { data: task, isLoading, error } = taskQuery;

  const [title, setTitle] = useState("");
  const [outcome, setOutcome] = useState("");
  const [domain, setDomain] = useState("");
  const [softwareName, setSoftwareName] = useState("");
  const [softwareVersion, setSoftwareVersion] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [facts, setFacts] = useState<string[]>([]);
  const [concepts, setConcepts] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setOutcome(task.outcome);
      setDomain(task.domain);
      setSoftwareName(task.software_name ?? "");
      setSoftwareVersion(task.software_version ?? "");
      setMediaUrl(task.media_url ?? "");
      setFacts(task.facts);
      setConcepts(task.concepts);
      setTags(task.tags);
    }
  }, [task]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!task) throw new Error("Task not loaded");
      return api.patch<TaskDetail>(`/tasks/${task.id}`, {
        title: title.trim() || undefined,
        outcome: outcome.trim() || undefined,
        domain: domain.trim() || undefined,
        software_name: softwareName.trim() || null,
        software_version: softwareVersion.trim() || null,
        media_url: mediaUrl.trim() || null,
        facts,
        concepts,
        tags,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      navigate(`/tasks/${updated.record_id}/${updated.version}`);
    },
  });

  const canSave = title.trim() && outcome.trim() && domain.trim();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
        Loading task…
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Task not found.</p>
        <Link to="/tasks" className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to tasks
        </Link>
      </div>
    );
  }

  const saveError = saveMutation.error instanceof ApiError
    ? saveMutation.error.message
    : saveMutation.error
      ? "An unexpected error occurred."
      : null;

  return (
    <div className="p-8 max-w-2xl">
      <Link
        to={`/tasks/${task.record_id}/${task.version}`}
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to task
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit task</h1>
      <p className="text-sm text-gray-400 mb-8">v{task.version} · {task.status} — steps are managed on the task detail page</p>

      <form
        onSubmit={(e) => { e.preventDefault(); if (canSave) saveMutation.mutate(); }}
        className="space-y-6"
      >
        <div className="space-y-1.5">
          <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short, specific task title" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="outcome">Outcome <span className="text-red-500">*</span></Label>
          <Textarea id="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Observable result when the task is complete" rows={3} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="domain">Domain <span className="text-red-500">*</span></Label>
          <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. infrastructure" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="softwareName">Software name</Label>
            <Input id="softwareName" value={softwareName} onChange={(e) => setSoftwareName(e.target.value)} placeholder="e.g. PostgreSQL" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="softwareVersion">Software version</Label>
            <Input id="softwareVersion" value={softwareVersion} onChange={(e) => setSoftwareVersion(e.target.value)} placeholder="e.g. 16.2" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mediaUrl">Media URL</Label>
          <Input id="mediaUrl" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…" />
        </div>

        <TagInput label="Facts" values={facts} onChange={setFacts} placeholder="Atomic statement — press Enter" />
        <TagInput label="Concepts" values={concepts} onChange={setConcepts} placeholder="Contextual knowledge — press Enter" />
        <TagInput label="Tags" values={tags} onChange={setTags} placeholder="Tag — press Enter" />

        {saveError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {saveError}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={!canSave || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/tasks/${task.record_id}/${task.version}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
