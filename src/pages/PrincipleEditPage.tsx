import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PrincipleDetail {
  id: string;
  record_id: string;
  version: number;
  status: string;
  title: string;
  summary: string;
  explanation: string;
  analogies: string | null;
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

export function PrincipleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: principle, isLoading, error } = useQuery({
    queryKey: ["principles", id],
    queryFn: () => api.get<PrincipleDetail>(`/principles/${id}`),
    enabled: !!id,
  });

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [explanation, setExplanation] = useState("");
  const [analogies, setAnalogies] = useState("");
  const [domain, setDomain] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (principle) {
      setTitle(principle.title);
      setSummary(principle.summary);
      setExplanation(principle.explanation);
      setAnalogies(principle.analogies ?? "");
      setDomain(principle.domain);
      setTags(principle.tags);
    }
  }, [principle]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!principle) throw new Error("Principle not loaded");
      return api.patch<PrincipleDetail>(`/principles/${principle.id}`, {
        title: title.trim() || undefined,
        summary: summary.trim() || undefined,
        explanation: explanation.trim() || undefined,
        analogies: analogies.trim() || null,
        domain: domain.trim() || undefined,
        tags,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["principles"] });
      navigate(`/principles/${updated.id}`);
    },
  });

  const canSave = title.trim() && summary.trim() && explanation.trim() && domain.trim();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
        Loading principle…
      </div>
    );
  }

  if (error || !principle) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Principle not found.</p>
        <Link to="/principles" className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to principles
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
        to={`/principles/${principle.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to principle
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit principle</h1>
      <p className="text-sm text-gray-400 mb-8">v{principle.version} · {principle.status}</p>

      <form
        onSubmit={(e) => { e.preventDefault(); if (canSave) saveMutation.mutate(); }}
        className="space-y-6"
      >
        <div className="space-y-1.5">
          <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name of the principle" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="domain">Domain <span className="text-red-500">*</span></Label>
          <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. linux-sysadmin" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="summary">Summary <span className="text-red-500">*</span></Label>
          <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One or two sentences capturing the core idea" rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="explanation">Explanation <span className="text-red-500">*</span></Label>
          <Textarea id="explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Full explanation of the principle" rows={6} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="analogies">Analogies <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Textarea id="analogies" value={analogies} onChange={(e) => setAnalogies(e.target.value)} placeholder="Real-world analogies or examples" rows={3} />
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
          <Button type="button" variant="outline" onClick={() => navigate(`/principles/${principle.id}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
