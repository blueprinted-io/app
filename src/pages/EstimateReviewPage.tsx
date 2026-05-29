import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle, GitMerge } from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface TriageEstimate {
  id: string;
  estimated_title: string;
  record_type: string;
  approved_type: string;
  estimate_status: string;
  sort_order: number;
}

interface IngestionChunk {
  id: string;
  chunk_index: number;
  section_title: string | null;
  chunk_status: string;
}

interface IngestionStatus {
  id: string;
  chunks: IngestionChunk[];
}

export function EstimateReviewPage() {
  const { id, chunkId } = useParams<{ id: string; chunkId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editingTitle, setEditingTitle] = useState<Record<string, string>>({});
  const [mergeSelected, setMergeSelected] = useState<Set<string>>(new Set());
  const [mergeTitle, setMergeTitle] = useState("");
  const [mergeMode, setMergeMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: ingestion } = useQuery({
    queryKey: ["ingestion", id, "status"],
    queryFn: () => api.get<IngestionStatus>(`/ingestions/${id}/status`),
    enabled: !!id,
  });

  const { data: estimates, isLoading } = useQuery({
    queryKey: ["estimates", id, chunkId],
    queryFn: () =>
      api.get<TriageEstimate[]>(`/ingestions/${id}/chunks/${chunkId}/estimates`),
    enabled: !!id && !!chunkId,
  });

  const chunk = ingestion?.chunks.find((c) => c.id === chunkId);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["estimates", id, chunkId] });
  }

  const patchMutation = useMutation({
    mutationFn: ({ estimateId, body }: { estimateId: string; body: object }) =>
      api.patch(`/ingestions/${id}/chunks/${chunkId}/estimates/${estimateId}`, body),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Update failed."),
  });

  const mergeMutation = useMutation({
    mutationFn: ({ estimate_ids, merged_title }: { estimate_ids: string[]; merged_title: string }) =>
      api.post(`/ingestions/${id}/chunks/${chunkId}/estimates/merge`, { estimate_ids, merged_title }),
    onSuccess: () => {
      setMergeMode(false);
      setMergeSelected(new Set());
      setMergeTitle("");
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Merge failed."),
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      api.post(`/ingestions/${id}/chunks/${chunkId}/estimates/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingestion", id] });
      navigate(`/ingestion/${id}`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Approve failed."),
  });

  function commitTitleEdit(est: TriageEstimate) {
    const title = editingTitle[est.id];
    if (title !== undefined && title !== est.estimated_title) {
      patchMutation.mutate({ estimateId: est.id, body: { estimated_title: title } });
    }
    setEditingTitle((prev) => {
      const next = { ...prev };
      delete next[est.id];
      return next;
    });
  }

  function toggleType(est: TriageEstimate) {
    const next = est.approved_type === "task" ? "principle" : "task";
    patchMutation.mutate({ estimateId: est.id, body: { approved_type: next } });
  }

  function reject(est: TriageEstimate) {
    patchMutation.mutate({ estimateId: est.id, body: { estimate_status: "rejected" } });
  }

  function toggleMergeSelect(id: string) {
    setMergeSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submitMerge() {
    if (mergeSelected.size < 2 || !mergeTitle.trim()) return;
    mergeMutation.mutate({
      estimate_ids: Array.from(mergeSelected),
      merged_title: mergeTitle.trim(),
    });
  }

  if (isLoading || !estimates) {
    return (
      <div className="bp-page">
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading estimates…</p>
      </div>
    );
  }

  const pending = estimates.filter((e) => e.estimate_status === "pending");
  const inactive = estimates.filter((e) => e.estimate_status !== "pending");
  const sortedPending = pending.slice().sort((a, b) => a.sort_order - b.sort_order);

  const chunkLabel = chunk?.section_title ?? (chunk ? `Section ${chunk.chunk_index + 1}` : "Section");

  return (
    <div className="bp-page" style={{ maxWidth: 680 }}>
      <div className="bp-crumbs">
        <Link
          to={`/ingestion/${id}`}
          className="bp-link"
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <ArrowLeft size={12} /> Back to ingestion
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <h1>Review estimates</h1>
          <p className="bp-page__sub">{chunkLabel}</p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, display: "flex", gap: 8, fontSize: 13, color: "var(--bp-danger)", background: "color-mix(in oklab, var(--bp-danger) 8%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-danger) 25%, var(--bp-border))", borderRadius: 12, padding: "10px 14px" }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <p>{error}</p>
        </div>
      )}

      {pending.length === 0 && inactive.length === 0 && (
        <p className="bp-muted" style={{ fontSize: 13 }}>No estimates for this section.</p>
      )}

      {sortedPending.length > 0 && (
        <div className="bp-card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          {sortedPending.map((est, i) => {
            const titleValue = editingTitle[est.id] ?? est.estimated_title;
            const isMergeSelecting = mergeMode;
            const isChecked = mergeSelected.has(est.id);

            return (
              <div
                key={est.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "12px 16px",
                  borderBottom: i < sortedPending.length - 1 ? "1px solid var(--bp-border)" : undefined,
                }}
              >
                {isMergeSelecting && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleMergeSelect(est.id)}
                    style={{ marginTop: 3, accentColor: "var(--bp-accent)", flexShrink: 0 }}
                  />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={titleValue}
                    onChange={(e) =>
                      setEditingTitle((prev) => ({ ...prev, [est.id]: e.target.value }))
                    }
                    onBlur={() => commitTitleEdit(est)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    style={{
                      width: "100%",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--bp-ink)",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      padding: 0,
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => toggleType(est)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 4,
                      border: "1px solid var(--bp-border)",
                      background: "var(--bp-panel)",
                      color: "var(--bp-ink)",
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                    title="Toggle type"
                  >
                    {est.approved_type}
                  </button>
                  <button
                    type="button"
                    onClick={() => reject(est)}
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 4,
                      border: "1px solid color-mix(in oklab, var(--bp-danger) 40%, var(--bp-border))",
                      background: "transparent",
                      color: "var(--bp-danger)",
                      cursor: "pointer",
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mergeMode && (
        <div className="bp-card" style={{ padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--bp-ink)", marginBottom: 8 }}>
            Merged title ({mergeSelected.size} selected)
          </p>
          <input
            type="text"
            className="bp-input"
            placeholder="Enter a single title for the merged extraction…"
            value={mergeTitle}
            onChange={(e) => setMergeTitle(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="bp-btn bp-btn--secondary"
              onClick={submitMerge}
              disabled={mergeSelected.size < 2 || !mergeTitle.trim() || mergeMutation.isPending}
            >
              {mergeMutation.isPending ? "Merging…" : "Confirm merge"}
            </button>
            <button
              type="button"
              className="bp-btn bp-btn--secondary"
              onClick={() => {
                setMergeMode(false);
                setMergeSelected(new Set());
                setMergeTitle("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="bp-btn bp-btn--primary"
          onClick={() => approveMutation.mutate()}
          disabled={approveMutation.isPending}
        >
          {approveMutation.isPending ? "Approving…" : "Approve & queue extraction"}
        </button>

        {!mergeMode && pending.length >= 2 && (
          <button
            type="button"
            className="bp-btn bp-btn--secondary"
            onClick={() => setMergeMode(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <GitMerge size={13} />
            Merge estimates
          </button>
        )}
      </div>

      {inactive.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)", marginBottom: 10 }}>
            Resolved ({inactive.length})
          </h2>
          <div className="bp-card" style={{ padding: 0, overflow: "hidden" }}>
            {inactive
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((est, i) => (
                <div
                  key={est.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderBottom: i < inactive.length - 1 ? "1px solid var(--bp-border)" : undefined,
                    opacity: 0.6,
                  }}
                >
                  <span style={{ flex: 1, fontSize: 13, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: est.estimate_status === "rejected" ? "line-through" : "none" }}>
                    {est.estimated_title}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--bp-muted)", flexShrink: 0, textTransform: "capitalize" }}>
                    {est.estimate_status}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
