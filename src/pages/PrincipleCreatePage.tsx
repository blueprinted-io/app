import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PrincipleResponse {
  id: string;
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
      if (submitAfter) {
        await api.post(`/principles/${principle.id}/submit`);
      }
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
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link
          to="/principles"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Principles
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">New principle</h1>
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
                placeholder="Name of the principle"
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="summary">
                Summary <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="One or two sentences capturing the core idea"
                rows={2}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="explanation">
                Explanation <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Full explanation of the principle — why it matters, when it applies"
                rows={6}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="analogies">
                Analogies <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="analogies"
                value={analogies}
                onChange={(e) => setAnalogies(e.target.value)}
                placeholder="Real-world analogies or examples that illustrate this principle"
                rows={3}
              />
            </div>

            <TagInput
              label="Tags"
              values={tags}
              onChange={setTags}
              placeholder="e.g. security, design"
            />
          </CardContent>
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
          <Link to="/principles" className="ml-auto text-sm text-gray-400 hover:text-gray-600">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
