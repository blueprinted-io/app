import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface WorkflowDetail {
  id: string;
  record_id: string;
  version: number;
  status: string;
  title: string;
  objective: string;
  domain: string;
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

export function WorkflowEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workflow, isLoading, error } = useQuery({
    queryKey: ["workflows", id],
    queryFn: () => api.get<WorkflowDetail>(`/workflows/${id}`),
    enabled: !!id,
  });

  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [domain, setDomain] = useState("");
  const [tags, setTags] = useState<string[]>([]);

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

  const canSave = title.trim() && objective.trim() && domain.trim();

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
        <p className="text-sm text-red-600">Workflow not found.</p>
        <Link to="/workflows" className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to workflows
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
        to={`/workflows/${workflow.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to workflow
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit workflow</h1>
      <p className="text-sm text-gray-400 mb-8">v{workflow.version} · {workflow.status} — task and principle refs are managed on the workflow detail page</p>

      <form
        onSubmit={(e) => { e.preventDefault(); if (canSave) saveMutation.mutate(); }}
        className="space-y-6"
      >
        <div className="space-y-1.5">
          <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What does this workflow accomplish?" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="objective">Objective <span className="text-red-500">*</span></Label>
          <Textarea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="The goal this workflow is designed to achieve" rows={3} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="domain">Domain <span className="text-red-500">*</span></Label>
          <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. infrastructure" />
        </div>

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
          <Button type="button" variant="outline" onClick={() => navigate(`/workflows/${workflow.id}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
