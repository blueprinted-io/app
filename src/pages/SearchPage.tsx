import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  submitted: "secondary",
  confirmed: "default",
  returned: "destructive",
  deprecated: "outline",
  retired: "outline",
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
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Search</h1>
      <p className="mt-1 text-sm text-gray-500">
        Search across confirmed tasks, workflows, and principles.
      </p>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim()}
          className="rounded-md bg-brand-amber px-4 py-2 text-sm font-medium text-brand-black hover:opacity-90 disabled:opacity-40"
        >
          Search
        </button>
      </form>

      {/* Type filter chips */}
      <div className="mt-4 flex gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === f.value
                ? "bg-brand-amber text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="mt-8 space-y-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
            Searching…
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">Search failed. Please try again.</p>
        )}

        {data && data.total === 0 && (
          <p className="text-sm text-gray-500">
            No results for <span className="font-medium">"{activeQuery}"</span>.
          </p>
        )}

        {data && data.total > 0 && (
          <>
            <p className="text-sm text-gray-500">
              {data.total} result{data.total !== 1 ? "s" : ""} for{" "}
              <span className="font-medium">"{activeQuery}"</span>
            </p>
            {data.results.map((result) => (
              <Link
                key={result.id}
                to={resultHref(result)}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-amber transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {TYPE_LABEL[result.record_type] ?? result.record_type}
                  </Badge>
                  <Badge variant={STATUS_VARIANT[result.status] ?? "outline"}>
                    {result.status}
                  </Badge>
                  {result.domain && (
                    <span className="text-xs text-gray-400">{result.domain}</span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">{result.title}</p>
                {result.excerpt && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{result.excerpt}</p>
                )}
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
