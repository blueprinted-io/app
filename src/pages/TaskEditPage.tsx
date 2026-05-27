import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";

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

export function TaskEditPage() {
  const { taskId, recordId, version } = useParams<{ taskId?: string; recordId?: string; version?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      <div className="bp-page">
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading task…</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="bp-page">
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Task not found.</p>
        <Link to="/tasks" className="bp-link" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={14} /> Back to tasks
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
    <div className="bp-page" style={{ maxWidth: 620 }}>
      <div className="bp-crumbs">
        <Link to={`/tasks/${task.record_id}/${task.version}`} className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Back to task
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <h1>Edit task</h1>
          <p className="bp-page__sub">v{task.version} · {task.status} — steps are managed on the task detail page</p>
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
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short, specific task title" />
            </div>
            <div>
              <Label htmlFor="outcome">Outcome <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Textarea id="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Observable result when the task is complete" rows={3} />
            </div>
            <div>
              <Label htmlFor="domain">Domain <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. infrastructure" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Label htmlFor="softwareName">Software name</Label>
                <Input id="softwareName" value={softwareName} onChange={(e) => setSoftwareName(e.target.value)} placeholder="e.g. PostgreSQL" />
              </div>
              <div>
                <Label htmlFor="softwareVersion">Software version</Label>
                <Input id="softwareVersion" value={softwareVersion} onChange={(e) => setSoftwareVersion(e.target.value)} placeholder="e.g. 16.2" />
              </div>
            </div>
            <div>
              <Label htmlFor="mediaUrl">Media URL</Label>
              <Input id="mediaUrl" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>
        </section>

        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head"><h3>Knowledge</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <TagInput label="Facts" values={facts} onChange={setFacts} placeholder="Atomic statement — press Enter" />
            <TagInput label="Concepts" values={concepts} onChange={setConcepts} placeholder="Contextual knowledge — press Enter" />
            <TagInput label="Tags" values={tags} onChange={setTags} placeholder="Tag — press Enter" />
          </div>
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
          <button type="button" className="bp-btn bp-btn--ghost" onClick={() => navigate(`/tasks/${task.record_id}/${task.version}`)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
