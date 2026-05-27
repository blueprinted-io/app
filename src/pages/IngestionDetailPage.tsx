import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

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
      <div className="bp-page">
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading…</p>
      </div>
    );
  }

  if (error || !ingestion) {
    return (
      <div className="bp-page">
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Ingestion not found or failed to load.</p>
        <Link to="/ingestion" className="bp-link" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={14} /> Back to ingestion
        </Link>
      </div>
    );
  }

  const totalCandidates = candidateCount(ingestion);
  const processing = isProcessing(ingestion);

  const needsNavSelection =
    ingestion.source_type === "html" &&
    ingestion.status === "ready" &&
    ingestion.chunks.length === 0;

  const pendingChunks = ingestion.chunks.filter((c) => c.chunk_status === "pending");
  const needsSectionSelection = !needsNavSelection && pendingChunks.length > 0;

  return (
    <div className="bp-page" style={{ maxWidth: 620 }}>
      <div className="bp-crumbs">
        <Link to="/ingestion" className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Ingestion
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <StatusBadge status={ingestion.status} />
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--bp-muted)" }}>{ingestion.source_type}</span>
          </div>
          <h1 style={{ wordBreak: "break-all" }}>{sourceLabel(ingestion)}</h1>
        </div>
      </div>

      {processing && (
        <p className="bp-muted" style={{ fontSize: 13, marginBottom: 16 }}>
          {ingestion.status === "chunking" ? "Chunking document…" : "Processing…"}
        </p>
      )}

      {ingestion.status === "failed" && ingestion.error_detail && (
        <div style={{ marginBottom: 20, display: "flex", gap: 8, fontSize: 13, color: "var(--bp-danger)", background: "color-mix(in oklab, var(--bp-danger) 8%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-danger) 25%, var(--bp-border))", borderRadius: 12, padding: "10px 14px" }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <p>{ingestion.error_detail}</p>
        </div>
      )}

      <div className="bp-card" style={{ padding: 16, marginBottom: 20 }}>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {ingestion.page_count != null && (
            <div>
              <dt style={{ fontSize: 11, color: "var(--bp-muted)", marginBottom: 2 }}>Pages</dt>
              <dd style={{ fontSize: 18, fontWeight: 600, color: "var(--bp-ink)" }}>{ingestion.page_count}</dd>
            </div>
          )}
          <div>
            <dt style={{ fontSize: 11, color: "var(--bp-muted)", marginBottom: 2 }}>Sections</dt>
            <dd style={{ fontSize: 18, fontWeight: 600, color: "var(--bp-ink)" }}>{ingestion.chunk_count ?? "—"}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 11, color: "var(--bp-muted)", marginBottom: 2 }}>Candidates</dt>
            <dd style={{ fontSize: 18, fontWeight: 600, color: "var(--bp-ink)" }}>{totalCandidates}</dd>
          </div>
        </dl>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {needsNavSelection && (
          <div className="bp-card" style={{ padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--bp-ink)", marginBottom: 4 }}>Select pages to import</p>
            <p className="bp-muted" style={{ fontSize: 13, marginBottom: 12 }}>
              Navigation pages have been discovered. Select which pages to render and extract sections from.
            </p>
            <Link to={`/ingestion/${ingestion.id}/nav-select`} className="bp-btn bp-btn--secondary">
              Select pages
            </Link>
          </div>
        )}

        {needsSectionSelection && (
          <div className="bp-card" style={{ padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--bp-ink)", marginBottom: 4 }}>
              Select sections ({pendingChunks.length} pending)
            </p>
            <p className="bp-muted" style={{ fontSize: 13, marginBottom: 12 }}>
              Choose which sections to send for LLM extraction.
            </p>
            <Link to={`/ingestion/${ingestion.id}/sections`} className="bp-btn bp-btn--secondary">
              Select sections
            </Link>
          </div>
        )}

        {totalCandidates > 0 && (
          <div className="bp-card" style={{ padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--bp-ink)", marginBottom: 4 }}>
              Review candidates ({totalCandidates})
            </p>
            <p className="bp-muted" style={{ fontSize: 13, marginBottom: 12 }}>
              Extracted candidates are ready for review. Accept, edit, or discard, then commit to the knowledge base.
            </p>
            <Link to={`/ingestion/${ingestion.id}/candidates`} className="bp-btn bp-btn--secondary">
              Review candidates
            </Link>
          </div>
        )}

        {ingestion.status === "ready" &&
          !needsNavSelection &&
          !needsSectionSelection &&
          totalCandidates === 0 && (
            <p className="bp-muted" style={{ fontSize: 13 }}>
              No sections selected yet. Use the section selector to begin extraction.
            </p>
          )}
      </div>
    </div>
  );
}
