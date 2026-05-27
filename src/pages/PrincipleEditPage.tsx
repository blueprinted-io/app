import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";

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
      <div className="bp-page">
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading principle…</p>
      </div>
    );
  }

  if (error || !principle) {
    return (
      <div className="bp-page">
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Principle not found.</p>
        <Link to="/principles" className="bp-link" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={14} /> Back to principles
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
        <Link to={`/principles/${principle.id}`} className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Back to principle
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <h1>Edit principle</h1>
          <p className="bp-page__sub">v{principle.version} · {principle.status}</p>
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
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name of the principle" />
            </div>
            <div>
              <Label htmlFor="domain">Domain <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. linux-sysadmin" />
            </div>
          </div>
        </section>

        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head"><h3>Content</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Label htmlFor="summary">Summary <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One or two sentences capturing the core idea" rows={2} />
            </div>
            <div>
              <Label htmlFor="explanation">Explanation <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Textarea id="explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Full explanation of the principle" rows={6} />
            </div>
            <div>
              <Label htmlFor="analogies">Analogies <span style={{ fontSize: 11, color: "var(--bp-muted)", fontWeight: 400 }}>(optional)</span></Label>
              <Textarea id="analogies" value={analogies} onChange={(e) => setAnalogies(e.target.value)} placeholder="Real-world analogies or examples" rows={3} />
            </div>
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
          <button type="button" className="bp-btn bp-btn--ghost" onClick={() => navigate(`/principles/${principle.id}`)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
