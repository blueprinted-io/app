import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";

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

  function toggle(chunkId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) next.delete(chunkId);
      else next.add(chunkId);
      return next;
    });
  }

  if (isLoading || !ingestion) {
    return (
      <div className="bp-page">
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading sections…</p>
      </div>
    );
  }

  const pendingChunks = ingestion.chunks.filter((c) => c.chunk_status === "pending");
  const otherChunks = ingestion.chunks.filter((c) => c.chunk_status !== "pending");
  const allSelected = selected.size === pendingChunks.length && pendingChunks.length > 0;

  return (
    <div className="bp-page" style={{ maxWidth: 720 }}>
      <div className="bp-crumbs">
        <Link to={`/ingestion/${id}`} className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Back to ingestion
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <h1>Select sections</h1>
          <p className="bp-page__sub">Choose which sections to send for extraction. Selected sections will be queued for LLM processing.</p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, fontSize: 13, color: "var(--bp-danger)", background: "color-mix(in oklab, var(--bp-danger) 8%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-danger) 25%, var(--bp-border))", borderRadius: 12, padding: "10px 14px" }}>
          {error}
        </div>
      )}

      {pendingChunks.length === 0 ? (
        <p className="bp-muted" style={{ fontSize: 13 }}>No pending sections. All sections have already been queued or processed.</p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--bp-ink)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                style={{ accentColor: "var(--bp-accent)" }}
              />
              Select all ({pendingChunks.length})
            </label>
            <span className="bp-muted" style={{ fontSize: 13 }}>{selected.size} selected</span>
          </div>

          <div className="bp-card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
            {pendingChunks
              .slice()
              .sort((a, b) => a.chunk_index - b.chunk_index)
              .map((chunk) => (
                <label
                  key={chunk.id}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--bp-border)", cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(chunk.id)}
                    onChange={() => toggle(chunk.id)}
                    style={{ marginTop: 2, accentColor: "var(--bp-accent)", flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {chunk.section_title ?? `Section ${chunk.chunk_index + 1}`}
                      </span>
                      {chunk.is_scanned && (
                        <span style={{ flexShrink: 0, fontSize: 11, color: "var(--bp-accent-deep)", background: "color-mix(in oklab, var(--bp-accent) 10%, var(--bp-bg))", border: "1px solid color-mix(in oklab, var(--bp-accent) 30%, var(--bp-border))", borderRadius: 4, padding: "1px 6px" }}>
                          scanned
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--bp-muted)" }}>
                      <span>{chunk.word_count} words</span>
                      {pageLabel(chunk.pages_json) && <span>{pageLabel(chunk.pages_json)}</span>}
                    </div>
                    <p style={{ marginTop: 4, fontSize: 11, color: "var(--bp-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{chunk.text_preview}</p>
                  </div>
                </label>
              ))}
          </div>

          <button
            type="button"
            className="bp-btn bp-btn--secondary"
            onClick={() => selectMutation.mutate(Array.from(selected))}
            disabled={selected.size === 0 || selectMutation.isPending}
          >
            {selectMutation.isPending ? "Queueing…" : `Queue ${selected.size} section${selected.size !== 1 ? "s" : ""}`}
          </button>
        </>
      )}

      {otherChunks.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)", marginBottom: 10 }}>
            Already processed ({otherChunks.length})
          </h2>
          <div className="bp-card" style={{ padding: 0, overflow: "hidden" }}>
            {otherChunks
              .slice()
              .sort((a, b) => a.chunk_index - b.chunk_index)
              .map((chunk) => (
                <div key={chunk.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--bp-border)" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 13, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {chunk.section_title ?? `Section ${chunk.chunk_index + 1}`}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--bp-muted)", flexShrink: 0 }}>
                    <span>{chunk.candidate_count} candidate{chunk.candidate_count !== 1 ? "s" : ""}</span>
                    <span style={{ textTransform: "capitalize" }}>{chunk.chunk_status}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
