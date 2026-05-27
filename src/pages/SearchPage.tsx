import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";

interface SearchResult {
  id: string;
  record_id: string;
  record_type: string;
  version: number;
  title: string;
  status: string;
  domain: string | null;
  excerpt: string;
  score: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  semantic_available: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  task: "Task",
  workflow: "Workflow",
  principle: "Principle",
};

type TypeFilter = "all" | "task" | "workflow" | "principle";

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "task", label: "Tasks" },
  { value: "workflow", label: "Workflows" },
  { value: "principle", label: "Principles" },
];

function resultHref(result: SearchResult): string {
  if (result.record_type === "task") return `/tasks/${result.record_id}/${result.version}`;
  if (result.record_type === "workflow") return `/workflows/${result.id}`;
  return `/principles/${result.id}`;
}

export function SearchPage() {
  const [input, setInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["search", activeQuery, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams({ q: activeQuery });
      if (typeFilter !== "all") params.set("type", typeFilter);
      return api.get<SearchResponse>(`/search?${params.toString()}`);
    },
    enabled: activeQuery.length > 0,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) setActiveQuery(trimmed);
  }

  return (
    <div className="bp-page" style={{ maxWidth: 720 }}>
      <div className="bp-page__head">
        <div>
          <h1>Search</h1>
          <p className="bp-page__sub">Search across confirmed tasks, workflows, and principles.</p>
        </div>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--bp-muted)", pointerEvents: "none" }} />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "8px 12px 8px 32px",
              border: "1px solid var(--bp-border)", borderRadius: 10,
              background: "var(--bp-panel)", color: "var(--bp-ink)",
              fontSize: 13, outline: "none",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim()}
          className="bp-btn bp-btn--secondary"
        >
          Search
        </button>
      </form>

      {/* Type filter chips */}
      <div style={{ display: "flex", gap: 6 }}>
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            style={{
              padding: "4px 12px", borderRadius: 999,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: "1px solid",
              background: typeFilter === f.value ? "var(--bp-accent)" : "var(--bp-panel)",
              color: typeFilter === f.value ? "var(--bp-brand)" : "var(--bp-muted)",
              borderColor: typeFilter === f.value ? "var(--bp-accent)" : "var(--bp-border)",
              transition: "background .12s ease",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {isLoading && (
          <p className="bp-muted" style={{ fontSize: 13 }}>Searching…</p>
        )}

        {error && (
          <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Search failed. Please try again.</p>
        )}

        {data && data.total === 0 && (
          <p className="bp-muted" style={{ fontSize: 13 }}>
            No results for <span style={{ fontWeight: 600, color: "var(--bp-ink)" }}>"{activeQuery}"</span>.
          </p>
        )}

        {data && data.total > 0 && (
          <>
            <p className="bp-muted" style={{ fontSize: 13 }}>
              {data.total} result{data.total !== 1 ? "s" : ""} for{" "}
              <span style={{ fontWeight: 600, color: "var(--bp-ink)" }}>"{activeQuery}"</span>
            </p>
            {data.results.map((result) => (
              <Link
                key={result.id}
                to={resultHref(result)}
                className="bp-card"
                style={{ display: "block", padding: "14px 16px", textDecoration: "none", transition: "box-shadow .15s ease" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Badge variant="outline">
                    {TYPE_LABEL[result.record_type] ?? result.record_type}
                  </Badge>
                  <StatusBadge status={result.status} />
                  {result.domain && (
                    <span style={{ fontSize: 11, color: "var(--bp-muted)" }}>{result.domain}</span>
                  )}
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--bp-ink)", margin: 0 }}>{result.title}</p>
                {result.excerpt && (
                  <p style={{ marginTop: 4, fontSize: 12, color: "var(--bp-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {result.excerpt}
                  </p>
                )}
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
