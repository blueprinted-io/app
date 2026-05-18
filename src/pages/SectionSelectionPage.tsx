import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface IngestionChunk {
  id: string;
  chunk_index: number;
  section_title: string | null;
  section_level: number;
  pages_json: number[] | null;
  text_preview: string;
  word_count: number;
  chunk_status: string;
  is_scanned: boolean;
  candidate_count: number;
}

interface IngestionStatus {
  id: string;
  source_type: string;
  status: string;
  chunks: IngestionChunk[];
}

function pageLabel(pages: number[] | null): string {
  if (!pages || pages.length === 0) return "";
  if (pages.length === 1) return `p.${pages[0]}`;
  return `pp.${pages[0]}–${pages[pages.length - 1]}`;
}

export function SectionSelectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { data: ingestion, isLoading } = useQuery({
    queryKey: ["ingestion", id, "status"],
    queryFn: () => api.get<IngestionStatus>(`/ingestions/${id}/status`),
    enabled: !!id,
  });

  const selectMutation = useMutation({
    mutationFn: (chunk_ids: string[]) =>
      api.post(`/ingestions/${id}/select`, { chunk_ids }),
    onSuccess: () => navigate(`/ingestion/${id}`),
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to queue sections.");
    },
  });

  function toggleAll() {
    if (!ingestion) return;
    const pending = ingestion.chunks.filter((c) => c.chunk_status === "pending");
    if (selected.size === pending.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map((c) => c.id)));
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

  if (isLoading || !ingestion) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
        Loading sections…
      </div>
    );
  }

  const pendingChunks = ingestion.chunks.filter((c) => c.chunk_status === "pending");
  const otherChunks = ingestion.chunks.filter((c) => c.chunk_status !== "pending");
  const allSelected = selected.size === pendingChunks.length && pendingChunks.length > 0;

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
        <h1 className="text-2xl font-bold text-gray-900">Select sections</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose which sections to send for extraction. Selected sections will be queued for LLM processing.
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {pendingChunks.length === 0 ? (
        <p className="text-sm text-gray-500">No pending sections. All sections have already been queued or processed.</p>
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
              Select all ({pendingChunks.length})
            </label>
            <span className="text-sm text-gray-400">{selected.size} selected</span>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 mb-6">
            {pendingChunks
              .slice()
              .sort((a, b) => a.chunk_index - b.chunk_index)
              .map((chunk) => (
                <label
                  key={chunk.id}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(chunk.id)}
                    onChange={() => toggle(chunk.id)}
                    className="mt-0.5 accent-brand-amber shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {chunk.section_title ?? `Section ${chunk.chunk_index + 1}`}
                      </span>
                      {chunk.is_scanned && (
                        <span className="shrink-0 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          scanned
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{chunk.word_count} words</span>
                      {pageLabel(chunk.pages_json) && <span>{pageLabel(chunk.pages_json)}</span>}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">{chunk.text_preview}</p>
                  </div>
                </label>
              ))}
          </div>

          <Button
            onClick={() => selectMutation.mutate(Array.from(selected))}
            disabled={selected.size === 0 || selectMutation.isPending}
          >
            {selectMutation.isPending ? "Queueing…" : `Queue ${selected.size} section${selected.size !== 1 ? "s" : ""}`}
          </Button>
        </>
      )}

      {/* Already processed chunks */}
      {otherChunks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Already processed ({otherChunks.length})
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {otherChunks
              .slice()
              .sort((a, b) => a.chunk_index - b.chunk_index)
              .map((chunk) => (
                <div key={chunk.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-gray-700 truncate">
                      {chunk.section_title ?? `Section ${chunk.chunk_index + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
                    <span>{chunk.candidate_count} candidate{chunk.candidate_count !== 1 ? "s" : ""}</span>
                    <span className="capitalize">{chunk.chunk_status}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
