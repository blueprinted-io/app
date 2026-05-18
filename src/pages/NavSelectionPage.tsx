import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface NavPage {
  id: string;
  url: string;
  title: string | null;
  nav_level: number;
  parent_id: string | null;
  nav_status: string;
  error_detail: string | null;
  chunk_count: number;
}

export function NavSelectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["ingestion", id, "nav-pages"],
    queryFn: () => api.get<NavPage[]>(`/ingestions/${id}/nav-pages`),
    enabled: !!id,
  });

  const selectMutation = useMutation({
    mutationFn: (nav_page_ids: string[]) =>
      api.post(`/ingestions/${id}/nav-select`, { nav_page_ids }),
    onSuccess: () => navigate(`/ingestion/${id}`),
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to queue pages.");
    },
  });

  function toggleAll() {
    if (!pages) return;
    const pending = pages.filter((p) => p.nav_status === "pending");
    if (selected.size === pending.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map((p) => p.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading || !pages) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
        Loading pages…
      </div>
    );
  }

  const pendingPages = pages.filter((p) => p.nav_status === "pending");
  const allSelected = selected.size === pendingPages.length && pendingPages.length > 0;

  return (
    <div className="p-8 max-w-3xl">
      <Link
        to={`/ingestion/${id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to ingestion
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Select pages</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose which discovered pages to render and extract sections from.
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {pendingPages.length === 0 ? (
        <p className="text-sm text-gray-500">No pending pages to select.</p>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="accent-brand-amber"
              />
              Select all ({pendingPages.length})
            </label>
            <span className="text-sm text-gray-400">{selected.size} selected</span>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 mb-6">
            {pages
              .filter((p) => p.nav_status === "pending")
              .map((page) => (
                <label
                  key={page.id}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  style={{ paddingLeft: `${16 + page.nav_level * 16}px` }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(page.id)}
                    onChange={() => toggle(page.id)}
                    className="mt-0.5 accent-brand-amber shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {page.title ?? page.url}
                    </p>
                    {page.title && (
                      <p className="text-xs text-gray-400 truncate">{page.url}</p>
                    )}
                  </div>
                </label>
              ))}
          </div>

          <Button
            onClick={() => selectMutation.mutate(Array.from(selected))}
            disabled={selected.size === 0 || selectMutation.isPending}
          >
            {selectMutation.isPending ? "Queueing…" : `Queue ${selected.size} page${selected.size !== 1 ? "s" : ""}`}
          </Button>
        </>
      )}

      {/* Already selected pages */}
      {pages.filter((p) => p.nav_status !== "pending").length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Already queued
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {pages
              .filter((p) => p.nav_status !== "pending")
              .map((page) => (
                <div key={page.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 truncate">{page.title ?? page.url}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 capitalize">{page.nav_status}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
