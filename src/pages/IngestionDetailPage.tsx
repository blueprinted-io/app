import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonVariants } from "@/components/ui/button";

interface IngestionChunk {
  id: string;
  chunk_index: number;
  section_title: string | null;
  chunk_status: string;
  candidate_count: number;
  word_count: number;
}

interface IngestionStatus {
  id: string;
  source_type: string;
  status: string;
  original_filename: string | null;
  source_url: string | null;
  page_count: number | null;
  chunk_count: number | null;
  error_detail: string | null;
  created_at: string;
  updated_at: string;
  chunks: IngestionChunk[];
}


function sourceLabel(ing: IngestionStatus): string {
  if (ing.source_type === "pdf") return ing.original_filename ?? "PDF";
  if (ing.source_type === "html") return ing.source_url ?? "HTML";
  return "JSON import";
}

function isProcessing(ing: IngestionStatus): boolean {
  return ing.status === "pending" || ing.status === "chunking" ||
    ing.chunks.some((c) => c.chunk_status === "queued" || c.chunk_status === "processing");
}

function candidateCount(ing: IngestionStatus): number {
  return ing.chunks.reduce((sum, c) => sum + c.candidate_count, 0);
}

export function IngestionDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ingestion, isLoading, error } = useQuery({
    queryKey: ["ingestion", id],
    queryFn: () => api.get<IngestionStatus>(`/ingestions/${id}/status`),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return isProcessing(data) ? 3000 : false;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
        Loading…
      </div>
    );
  }

  if (error || !ingestion) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Ingestion not found or failed to load.</p>
        <Link to="/ingestion" className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to ingestion
        </Link>
      </div>
    );
  }

  const totalCandidates = candidateCount(ingestion);
  const processing = isProcessing(ingestion);

  // HTML site-nav: ready but no chunks yet — show nav page selection
  const needsNavSelection =
    ingestion.source_type === "html" &&
    ingestion.status === "ready" &&
    ingestion.chunks.length === 0;

  // Has sections to select (chunks in pending state)
  const pendingChunks = ingestion.chunks.filter((c) => c.chunk_status === "pending");
  const needsSectionSelection = !needsNavSelection && pendingChunks.length > 0;

  return (
    <div className="p-8 max-w-2xl">
      <Link
        to="/ingestion"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Ingestion
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <StatusBadge status={ingestion.status} />
          <span className="text-xs text-gray-400 uppercase font-medium">{ingestion.source_type}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 break-all">{sourceLabel(ingestion)}</h1>
      </div>

      {/* Processing indicator */}
      {processing && (
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
          {ingestion.status === "chunking" ? "Chunking document…" : "Processing…"}
        </div>
      )}

      {/* Error */}
      {ingestion.status === "failed" && ingestion.error_detail && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 flex gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{ingestion.error_detail}</p>
        </div>
      )}

      {/* Stats */}
      <dl className="mb-8 grid grid-cols-3 gap-4 rounded-lg border border-gray-200 bg-white p-4">
        {ingestion.page_count != null && (
          <div>
            <dt className="text-xs text-gray-400">Pages</dt>
            <dd className="text-lg font-semibold text-gray-900">{ingestion.page_count}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-gray-400">Sections</dt>
          <dd className="text-lg font-semibold text-gray-900">{ingestion.chunk_count ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Candidates</dt>
          <dd className="text-lg font-semibold text-gray-900">{totalCandidates}</dd>
        </div>
      </dl>

      {/* Next action */}
      <div className="space-y-3">
        {needsNavSelection && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-900 mb-1">Select pages to import</p>
            <p className="text-sm text-gray-500 mb-3">
              Navigation pages have been discovered. Select which pages to render and extract sections from.
            </p>
            <Link
              to={`/ingestion/${ingestion.id}/nav-select`}
              className={buttonVariants({ variant: "default" })}
            >
              Select pages
            </Link>
          </div>
        )}

        {needsSectionSelection && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-900 mb-1">
              Select sections ({pendingChunks.length} pending)
            </p>
            <p className="text-sm text-gray-500 mb-3">
              Choose which sections to send for LLM extraction.
            </p>
            <Link
              to={`/ingestion/${ingestion.id}/sections`}
              className={buttonVariants({ variant: "default" })}
            >
              Select sections
            </Link>
          </div>
        )}

        {totalCandidates > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-900 mb-1">
              Review candidates ({totalCandidates})
            </p>
            <p className="text-sm text-gray-500 mb-3">
              Extracted candidates are ready for review. Accept, edit, or discard, then commit to the knowledge base.
            </p>
            <Link
              to={`/ingestion/${ingestion.id}/candidates`}
              className={buttonVariants({ variant: "default" })}
            >
              Review candidates
            </Link>
          </div>
        )}

        {ingestion.status === "ready" &&
          !needsNavSelection &&
          !needsSectionSelection &&
          totalCandidates === 0 && (
            <p className="text-sm text-gray-500">
              No sections selected yet. Use the section selector to begin extraction.
            </p>
          )}
      </div>
    </div>
  );
}
