import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";

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

  function toggle(pageId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }

  if (isLoading || !pages) {
    return (
      <div className="bp-page">
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading pages…</p>
      </div>
    );
  }

  const pendingPages = pages.filter((p) => p.nav_status === "pending");
  const allSelected = selected.size === pendingPages.length && pendingPages.length > 0;

  return (
    <div className="bp-page" style={{ maxWidth: 720 }}>
      <div className="bp-crumbs">
        <Link to={`/ingestion/${id}`} className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Back to ingestion
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <h1>Select pages</h1>
          <p className="bp-page__sub">Choose which discovered pages to render and extract sections from.</p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, fontSize: 13, color: "var(--bp-danger)", background: "color-mix(in oklab, var(--bp-danger) 8%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-danger) 25%, var(--bp-border))", borderRadius: 12, padding: "10px 14px" }}>
          {error}
        </div>
      )}

      {pendingPages.length === 0 ? (
        <p className="bp-muted" style={{ fontSize: 13 }}>No pending pages to select.</p>
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
              Select all ({pendingPages.length})
            </label>
            <span className="bp-muted" style={{ fontSize: 13 }}>{selected.size} selected</span>
          </div>

          <div className="bp-card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
            {pages
              .filter((p) => p.nav_status === "pending")
              .map((page) => (
                <label
                  key={page.id}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: `10px 16px 10px ${16 + page.nav_level * 16}px`,
                    borderBottom: "1px solid var(--bp-border)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(page.id)}
                    onChange={() => toggle(page.id)}
                    style={{ marginTop: 2, accentColor: "var(--bp-accent)", flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {page.title ?? page.url}
                    </p>
                    {page.title && (
                      <p className="bp-muted" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.url}</p>
                    )}
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
            {selectMutation.isPending ? "Queueing…" : `Queue ${selected.size} page${selected.size !== 1 ? "s" : ""}`}
          </button>
        </>
      )}

      {pages.filter((p) => p.nav_status !== "pending").length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)", marginBottom: 10 }}>
            Already queued
          </h2>
          <div className="bp-card" style={{ padding: 0, overflow: "hidden" }}>
            {pages
              .filter((p) => p.nav_status !== "pending")
              .map((page) => (
                <div key={page.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--bp-border)" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, color: "var(--bp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.title ?? page.url}</p>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--bp-muted)", flexShrink: 0, textTransform: "capitalize" }}>{page.nav_status}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
