import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";

interface PrincipleResponse {
  id: string;
}

export function PrincipleCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [explanation, setExplanation] = useState("");
  const [analogies, setAnalogies] = useState("");
  const [domain, setDomain] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async ({ submitAfter }: { submitAfter: boolean }) => {
      const principle = await api.post<PrincipleResponse>("/principles", {
        title,
        summary,
        explanation,
        analogies: analogies.trim() || null,
        domain,
        tags,
      });
      if (submitAfter) await api.post(`/principles/${principle.id}/submit`);
      return principle;
    },
    onSuccess: (principle) => {
      queryClient.invalidateQueries({ queryKey: ["principles"] });
      navigate(`/principles/${principle.id}`);
    },
  });

  const isValid = title.trim() && summary.trim() && explanation.trim() && domain.trim();
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
        <Link to="/principles" className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Principles
        </Link>
      </div>

      <div className="bp-page__head">
        <div><h1>New principle</h1></div>
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
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name of the principle" required />
            </div>
            <div>
              <Label htmlFor="domain">Domain <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. linux-sysadmin" required />
            </div>
          </div>
        </section>

        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head"><h3>Content</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Label htmlFor="summary">Summary <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One or two sentences capturing the core idea" rows={2} required />
            </div>
            <div>
              <Label htmlFor="explanation">Explanation <span style={{ color: "var(--bp-danger)" }}>*</span></Label>
              <Textarea id="explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Full explanation of the principle — why it matters, when it applies" rows={6} required />
            </div>
            <div>
              <Label htmlFor="analogies">Analogies <span style={{ fontSize: 11, color: "var(--bp-muted)", fontWeight: 400 }}>(optional)</span></Label>
              <Textarea id="analogies" value={analogies} onChange={(e) => setAnalogies(e.target.value)} placeholder="Real-world analogies or examples that illustrate this principle" rows={3} />
            </div>
            <TagInput label="Tags" values={tags} onChange={setTags} placeholder="e.g. security, design" />
          </div>
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
          <Link to="/principles" className="bp-link" style={{ marginLeft: "auto", fontSize: 13 }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
