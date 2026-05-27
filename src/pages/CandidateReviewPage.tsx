import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface Candidate {
  id: string;
  ingestion_id: string;
  chunk_id: string | null;
  record_type: string;
  proposed_json: Record<string, unknown>;
  candidate_status: string;
  review_note: string | null;
  committed_record_id: string | null;
  reviewed_at: string | null;
}

interface CommitForm {
  domain: string;
  target_status: "draft" | "submitted";
}

function CandidateCard({
  candidate,
  ingestionId,
}: {
  candidate: Candidate;
  ingestionId: string;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const [commitForm, setCommitForm] = useState<CommitForm>({ domain: "", target_status: "draft" });
  const [actionError, setActionError] = useState<string | null>(null);

  const isTerminal = candidate.candidate_status === "discarded" || candidate.committed_record_id != null;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["ingestion", ingestionId, "candidates"] });
    queryClient.invalidateQueries({ queryKey: ["ingestion", ingestionId] });
  }

  const acceptMutation = useMutation({
    mutationFn: () =>
      api.patch(`/ingestions/${ingestionId}/candidates/${candidate.id}`, { action: "accept" }),
    onSuccess: () => { setActionError(null); invalidate(); },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Failed."),
  });

  const discardMutation = useMutation({
    mutationFn: () =>
      api.patch(`/ingestions/${ingestionId}/candidates/${candidate.id}`, { action: "discard" }),
    onSuccess: () => { setActionError(null); invalidate(); },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Failed."),
  });

  const commitMutation = useMutation({
    mutationFn: () =>
      api.post(`/ingestions/${ingestionId}/candidates/${candidate.id}/commit`, commitForm),
    onSuccess: () => { setCommitOpen(false); setActionError(null); invalidate(); },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Failed to commit."),
  });

  const isPending = acceptMutation.isPending || discardMutation.isPending || commitMutation.isPending;
  const title = (candidate.proposed_json.title as string | undefined) ?? `${candidate.record_type} candidate`;

  return (
    <div className="bp-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 14 }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ marginTop: 2, flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--bp-muted)", display: "inline-flex", alignItems: "center" }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <StatusBadge status={candidate.candidate_status} />
            <span style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, color: "var(--bp-muted)" }}>{candidate.record_type}</span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
          {candidate.committed_record_id && (
            <p style={{ fontSize: 11, color: "var(--bp-muted)", marginTop: 2 }}>
              Committed →{" "}
              <Link
                to={`/${candidate.record_type === "task" ? "tasks" : "principles"}/${candidate.committed_record_id}`}
                className="bp-link"
              >
                view record
              </Link>
            </p>
          )}
        </div>

        {!isTerminal && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {candidate.candidate_status !== "accepted" && candidate.candidate_status !== "edited" ? (
              <button
                type="button"
                className="bp-btn bp-btn--secondary"
                style={{ fontSize: 12, padding: "4px 10px" }}
                onClick={() => acceptMutation.mutate()}
                disabled={isPending}
              >
                {acceptMutation.isPending ? "Accepting…" : "Accept"}
              </button>
            ) : (
              <button
                type="button"
                className="bp-btn bp-btn--secondary"
                style={{ fontSize: 12, padding: "4px 10px" }}
                onClick={() => setCommitOpen((v) => !v)}
                disabled={isPending}
              >
                Commit
              </button>
            )}
            {candidate.candidate_status !== "accepted" && candidate.candidate_status !== "edited" && (
              <button
                type="button"
                className="bp-btn bp-btn--ghost"
                style={{ fontSize: 12, padding: "4px 10px" }}
                onClick={() => discardMutation.mutate()}
                disabled={isPending}
              >
                {discardMutation.isPending ? "Discarding…" : "Discard"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Commit form */}
      {commitOpen && !isTerminal && (
        <div style={{ borderTop: "1px solid var(--bp-border)", padding: "12px 14px", background: "var(--bp-bg)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--bp-muted)", marginBottom: 4 }}>Domain</label>
              <input
                type="text"
                value={commitForm.domain}
                onChange={(e) => setCommitForm((f) => ({ ...f, domain: e.target.value }))}
                placeholder="e.g. software-engineering"
                className="bp-input"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--bp-muted)", marginBottom: 4 }}>Create as</label>
              <select
                value={commitForm.target_status}
                onChange={(e) =>
                  setCommitForm((f) => ({
                    ...f,
                    target_status: e.target.value as "draft" | "submitted",
                  }))
                }
                style={{ borderRadius: 8, border: "1px solid var(--bp-border)", background: "var(--bp-panel)", color: "var(--bp-ink)", fontSize: 13, padding: "6px 10px", outline: "none" }}
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
              </select>
            </div>
            <button
              type="button"
              className="bp-btn bp-btn--secondary"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => commitMutation.mutate()}
              disabled={!commitForm.domain.trim() || commitMutation.isPending}
            >
              {commitMutation.isPending ? "Committing…" : "Confirm commit"}
            </button>
            <button
              type="button"
              className="bp-btn bp-btn--ghost"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => setCommitOpen(false)}
              disabled={commitMutation.isPending}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {actionError && (
        <div style={{ borderTop: "1px solid var(--bp-border)", padding: "8px 14px" }}>
          <p style={{ fontSize: 12, color: "var(--bp-danger)" }}>{actionError}</p>
        </div>
      )}

      {expanded && (
        <div style={{ borderTop: "1px solid var(--bp-border)", padding: "10px 14px" }}>
          <pre style={{ fontSize: 11, color: "var(--bp-muted)", whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 384, margin: 0 }}>
            {JSON.stringify(candidate.proposed_json, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function CandidateReviewPage() {
  const { id } = useParams<{ id: string }>();

  const { data: candidates, isLoading, error } = useQuery({
    queryKey: ["ingestion", id, "candidates"],
    queryFn: () => api.get<Candidate[]>(`/ingestions/${id}/candidates`),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.some((c) => c.candidate_status === "pending") ? 5000 : false;
    },
  });

  if (isLoading) {
    return (
      <div className="bp-page">
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading candidates…</p>
      </div>
    );
  }

  if (error || !candidates) {
    return (
      <div className="bp-page">
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Failed to load candidates.</p>
        <Link to={`/ingestion/${id}`} className="bp-link" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={14} /> Back to ingestion
        </Link>
      </div>
    );
  }

  const pending = candidates.filter((c) => c.candidate_status === "pending");
  const accepted = candidates.filter(
    (c) => (c.candidate_status === "accepted" || c.candidate_status === "edited") && !c.committed_record_id
  );
  const committed = candidates.filter((c) => c.committed_record_id != null);
  const discarded = candidates.filter((c) => c.candidate_status === "discarded");

  return (
    <div className="bp-page" style={{ maxWidth: 760 }}>
      <div className="bp-crumbs">
        <Link to={`/ingestion/${id}`} className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Back to ingestion
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <h1>Review candidates</h1>
          <p className="bp-page__sub">
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} extracted.
            Accept candidates and commit them to the knowledge base.
          </p>
        </div>
      </div>

      {candidates.length === 0 && (
        <p className="bp-muted" style={{ fontSize: 13 }}>No candidates yet. Sections may still be processing.</p>
      )}

      {pending.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)", marginBottom: 10 }}>
            Pending review ({pending.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((c) => (
              <CandidateCard key={c.id} candidate={c} ingestionId={id!} />
            ))}
          </div>
        </section>
      )}

      {accepted.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)", marginBottom: 10 }}>
            Accepted — ready to commit ({accepted.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {accepted.map((c) => (
              <CandidateCard key={c.id} candidate={c} ingestionId={id!} />
            ))}
          </div>
        </section>
      )}

      {committed.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)", marginBottom: 10 }}>
            Committed ({committed.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {committed.map((c) => (
              <CandidateCard key={c.id} candidate={c} ingestionId={id!} />
            ))}
          </div>
        </section>
      )}

      {discarded.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)", marginBottom: 10 }}>
            Discarded ({discarded.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {discarded.map((c) => (
              <CandidateCard key={c.id} candidate={c} ingestionId={id!} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
