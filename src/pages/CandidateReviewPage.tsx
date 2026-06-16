import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";

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

function candidateTitle(c: Candidate): string {
  return (c.proposed_json.title as string | undefined) ?? `${c.record_type} candidate`;
}

function TypeTag({ type }: { type: string }) {
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: ".06em",
      color: type === "task" ? "var(--bp-accent)" : "var(--bp-muted)",
      background: type === "task"
        ? "color-mix(in oklab, var(--bp-accent) 12%, var(--bp-panel))"
        : "var(--bp-surface)",
      borderRadius: 4,
      padding: "2px 6px",
    }}>
      {type}
    </span>
  );
}

function CandidateRow({
  candidate,
  checked,
  onToggle,
  onDiscard,
  isDiscarding,
}: {
  candidate: Candidate;
  checked: boolean;
  onToggle: () => void;
  onDiscard: () => void;
  isDiscarding: boolean;
}) {
  const title = candidateTitle(candidate);
  return (
    <label style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid var(--bp-border)",
      background: checked ? "color-mix(in oklab, var(--bp-accent) 5%, var(--bp-panel))" : "var(--bp-panel)",
      cursor: "pointer",
      transition: "background 120ms",
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ width: 15, height: 15, accentColor: "var(--bp-accent)", flexShrink: 0 }}
      />
      <TypeTag type={candidate.record_type} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {title}
      </span>
      <button
        type="button"
        className="bp-btn bp-btn--ghost"
        style={{ fontSize: 12, padding: "3px 10px", flexShrink: 0 }}
        onClick={(e) => { e.preventDefault(); onDiscard(); }}
        disabled={isDiscarding}
      >
        {isDiscarding ? "…" : "Discard"}
      </button>
    </label>
  );
}

function CommittedRow({ candidate }: { candidate: Candidate }) {
  const title = candidateTitle(candidate);
  const recordPath = candidate.record_type === "task" ? "tasks" : "principles";
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid var(--bp-border)",
      background: "var(--bp-panel)",
    }}>
      <Check size={14} style={{ color: "var(--bp-success, #22c55e)", flexShrink: 0 }} />
      <TypeTag type={candidate.record_type} />
      <span style={{ flex: 1, fontSize: 13, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {title}
      </span>
      {candidate.committed_record_id && (
        <Link
          to={`/${recordPath}/${candidate.committed_record_id}`}
          className="bp-link"
          style={{ fontSize: 12, flexShrink: 0 }}
        >
          view record
        </Link>
      )}
    </div>
  );
}

function DiscardedRow({
  candidate,
  onPromote,
  isPromoting,
}: {
  candidate: Candidate;
  onPromote: () => void;
  isPromoting: boolean;
}) {
  const title = candidateTitle(candidate);
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid var(--bp-border)",
      background: "var(--bp-panel)",
      opacity: 0.65,
    }}>
      <TypeTag type={candidate.record_type} />
      <span style={{ flex: 1, fontSize: 13, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {title}
      </span>
      <button
        type="button"
        className="bp-btn bp-btn--ghost"
        style={{ fontSize: 12, padding: "3px 10px", flexShrink: 0 }}
        onClick={onPromote}
        disabled={isPromoting}
      >
        {isPromoting ? "…" : "Promote back"}
      </button>
    </div>
  );
}

export function CandidateReviewPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [domain, setDomain] = useState("");
  const [targetStatus, setTargetStatus] = useState<"draft" | "submitted">("draft");
  const [commitError, setCommitError] = useState<string | null>(null);
  const [discardingId, setDiscardingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const { data: candidates, isLoading, error } = useQuery({
    queryKey: ["ingestion", id, "candidates"],
    queryFn: () => api.get<Candidate[]>(`/ingestions/${id}/candidates`),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.some((c) => c.candidate_status === "pending" && c.committed_record_id == null) ? 5000 : false;
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["ingestion", id, "candidates"] });
    queryClient.invalidateQueries({ queryKey: ["ingestion", id] });
  }

  const commitMutation = useMutation({
    mutationFn: (candidateIds: string[]) =>
      api.post(`/ingestions/${id}/candidates/commit-batch`, {
        candidate_ids: candidateIds,
        domain: domain.trim(),
        target_status: targetStatus,
      }),
    onSuccess: () => {
      setSelected(new Set());
      setCommitError(null);
      invalidate();
    },
    onError: (err) => setCommitError(err instanceof ApiError ? err.message : "Commit failed."),
  });

  const discardMutation = useMutation({
    mutationFn: (candidateId: string) => {
      setDiscardingId(candidateId);
      return api.patch(`/ingestions/${id}/candidates/${candidateId}`, { action: "discard" });
    },
    onSuccess: (_data, candidateId) => {
      setSelected((prev) => { const next = new Set(prev); next.delete(candidateId); return next; });
      setDiscardingId(null);
      invalidate();
    },
    onError: () => setDiscardingId(null),
  });

  const promoteMutation = useMutation({
    mutationFn: (candidateId: string) => {
      setPromotingId(candidateId);
      return api.post(`/ingestions/${id}/candidates/${candidateId}/promote`, {});
    },
    onSuccess: () => { setPromotingId(null); invalidate(); },
    onError: () => setPromotingId(null),
  });

  const { available, committed, discarded } = useMemo(() => {
    const all = candidates ?? [];
    return {
      available: all.filter(
        (c) => c.committed_record_id == null && c.candidate_status !== "discarded"
      ),
      committed: all.filter((c) => c.committed_record_id != null),
      discarded: all.filter((c) => c.candidate_status === "discarded" && c.committed_record_id == null),
    };
  }, [candidates]);

  const availableIds = useMemo(() => available.map((c) => c.id), [available]);
  const selectedInAvailable = availableIds.filter((cid) => selected.has(cid));
  const allSelected = availableIds.length > 0 && selectedInAvailable.length === availableIds.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(availableIds));
    }
  }

  function toggleOne(candidateId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  }

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

  const domainTrimmed = domain.trim();
  const canCommit = domainTrimmed.length > 0 && !commitMutation.isPending;

  return (
    <div className="bp-page" style={{ maxWidth: 760 }}>
      <div className="bp-crumbs">
        <Link to={`/ingestion/${id}`} className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Back to ingestion
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <h1>Commit candidates</h1>
          <p className="bp-page__sub">
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} extracted.
            Select which to commit to the knowledge base.
          </p>
        </div>
      </div>

      {/* Commit panel */}
      {available.length > 0 && (
        <div className="bp-card" style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--bp-muted)", marginBottom: 4 }}>
                Domain
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. software-engineering"
                className="bp-input"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--bp-muted)", marginBottom: 4 }}>
                Create as
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as "draft" | "submitted")}
                style={{ borderRadius: 8, border: "1px solid var(--bp-border)", background: "var(--bp-panel)", color: "var(--bp-ink)", fontSize: 13, padding: "6px 10px", outline: "none" }}
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
              </select>
            </div>
            <button
              type="button"
              className="bp-btn bp-btn--secondary"
              style={{ fontSize: 13, padding: "6px 14px" }}
              onClick={() => commitMutation.mutate(selectedInAvailable)}
              disabled={!canCommit || selectedInAvailable.length === 0}
            >
              {commitMutation.isPending
                ? "Committing…"
                : `Commit ${selectedInAvailable.length > 0 ? selectedInAvailable.length : ""} selected`.trim()}
            </button>
            <button
              type="button"
              className="bp-btn bp-btn--ghost"
              style={{ fontSize: 13, padding: "6px 14px" }}
              onClick={() => commitMutation.mutate(availableIds)}
              disabled={!canCommit || availableIds.length === 0}
            >
              Commit all {availableIds.length}
            </button>
          </div>
          {commitError && (
            <p style={{ fontSize: 12, color: "var(--bp-danger)", marginTop: 8 }}>{commitError}</p>
          )}
        </div>
      )}

      {/* Available candidates */}
      {available.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)" }}>
              Available ({available.length})
            </h2>
            <button
              type="button"
              className="bp-btn bp-btn--ghost"
              style={{ fontSize: 12, padding: "2px 8px" }}
              onClick={toggleAll}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {available.map((c) => (
              <CandidateRow
                key={c.id}
                candidate={c}
                checked={selected.has(c.id)}
                onToggle={() => toggleOne(c.id)}
                onDiscard={() => discardMutation.mutate(c.id)}
                isDiscarding={discardingId === c.id}
              />
            ))}
          </div>
        </section>
      )}

      {candidates.length === 0 && (
        <p className="bp-muted" style={{ fontSize: 13 }}>No candidates yet. Sections may still be processing.</p>
      )}

      {/* Committed */}
      {committed.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)", marginBottom: 10 }}>
            Committed ({committed.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {committed.map((c) => (
              <CommittedRow key={c.id} candidate={c} />
            ))}
          </div>
        </section>
      )}

      {/* Discarded */}
      {discarded.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)", marginBottom: 10 }}>
            Discarded ({discarded.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {discarded.map((c) => (
              <DiscardedRow
                key={c.id}
                candidate={c}
                onPromote={() => promoteMutation.mutate(c.id)}
                isPromoting={promotingId === c.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
