import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";

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
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-600"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <StatusBadge status={candidate.candidate_status} />
            <span className="text-xs uppercase font-medium text-gray-400">{candidate.record_type}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          {candidate.committed_record_id && (
            <p className="text-xs text-gray-400 mt-0.5">
              Committed →{" "}
              <Link
                to={`/${candidate.record_type === "task" ? "tasks" : "principles"}/${candidate.committed_record_id}`}
                className="text-brand-amber hover:underline"
              >
                view record
              </Link>
            </p>
          )}
        </div>

        {!isTerminal && (
          <div className="flex items-center gap-2 shrink-0">
            {candidate.candidate_status !== "accepted" && candidate.candidate_status !== "edited" ? (
              <Button
                size="sm"
                onClick={() => acceptMutation.mutate()}
                disabled={isPending}
              >
                {acceptMutation.isPending ? "Accepting…" : "Accept"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setCommitOpen((v) => !v)}
                disabled={isPending}
              >
                Commit
              </Button>
            )}
            {candidate.candidate_status !== "accepted" && candidate.candidate_status !== "edited" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => discardMutation.mutate()}
                disabled={isPending}
              >
                {discardMutation.isPending ? "Discarding…" : "Discard"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Commit form */}
      {commitOpen && !isTerminal && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-gray-600 mb-1">Domain</label>
              <input
                type="text"
                value={commitForm.domain}
                onChange={(e) => setCommitForm((f) => ({ ...f, domain: e.target.value }))}
                placeholder="e.g. software-engineering"
                className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Create as</label>
              <select
                value={commitForm.target_status}
                onChange={(e) =>
                  setCommitForm((f) => ({
                    ...f,
                    target_status: e.target.value as "draft" | "submitted",
                  }))
                }
                className="block rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
              </select>
            </div>
            <Button
              size="sm"
              onClick={() => commitMutation.mutate()}
              disabled={!commitForm.domain.trim() || commitMutation.isPending}
            >
              {commitMutation.isPending ? "Committing…" : "Confirm commit"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCommitOpen(false)}
              disabled={commitMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {actionError && (
        <div className="border-t border-gray-100 px-4 py-2">
          <p className="text-xs text-red-600">{actionError}</p>
        </div>
      )}

      {/* Expanded JSON */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all overflow-auto max-h-96">
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
      // Poll if any chunks are still being processed
      return data.some((c) => c.candidate_status === "pending") ? 5000 : false;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
        Loading candidates…
      </div>
    );
  }

  if (error || !candidates) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Failed to load candidates.</p>
        <Link to={`/ingestion/${id}`} className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to ingestion
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
    <div className="p-8 max-w-3xl">
      <Link
        to={`/ingestion/${id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to ingestion
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Review candidates</h1>
        <p className="mt-1 text-sm text-gray-500">
          {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} extracted.
          Accept candidates and commit them to the knowledge base.
        </p>
      </div>

      {candidates.length === 0 && (
        <p className="text-sm text-gray-500">No candidates yet. Sections may still be processing.</p>
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Pending review ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((c) => (
              <CandidateCard key={c.id} candidate={c} ingestionId={id!} />
            ))}
          </div>
        </section>
      )}

      {accepted.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Accepted — ready to commit ({accepted.length})
          </h2>
          <div className="space-y-3">
            {accepted.map((c) => (
              <CandidateCard key={c.id} candidate={c} ingestionId={id!} />
            ))}
          </div>
        </section>
      )}

      {committed.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Committed ({committed.length})
          </h2>
          <div className="space-y-3">
            {committed.map((c) => (
              <CandidateCard key={c.id} candidate={c} ingestionId={id!} />
            ))}
          </div>
        </section>
      )}

      {discarded.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Discarded ({discarded.length})
          </h2>
          <div className="space-y-3">
            {discarded.map((c) => (
              <CandidateCard key={c.id} candidate={c} ingestionId={id!} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
