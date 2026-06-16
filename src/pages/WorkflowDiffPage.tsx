import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { MarkdownBody } from "@/components/MarkdownBody";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskRef {
  task_record_id: string;
  order_index: number;
}

interface PrincipleRef {
  principle_record_id: string;
}

interface WorkflowSnapshot {
  id: string;
  record_id: string;
  version: number;
  status: string;
  title: string;
  objective: string;
  domain: string;
  tags: string[];
  task_refs: TaskRef[];
  principle_refs: PrincipleRef[];
  change_note: string | null;
}

interface WorkflowDiff {
  current: WorkflowSnapshot;
  previous: WorkflowSnapshot;
}

// ---------------------------------------------------------------------------
// Diff primitives (same pattern as TaskDiffPage)
// ---------------------------------------------------------------------------

function changed(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}


const cellStyle = (highlighted: boolean): React.CSSProperties => ({
  padding: "10px 12px",
  borderRadius: 8,
  fontSize: 13,
  lineHeight: 1.5,
  background: highlighted
    ? "color-mix(in oklab, var(--bp-warn) 12%, var(--bp-panel))"
    : "var(--bp-panel)",
  border: `1px solid ${highlighted ? "color-mix(in oklab, var(--bp-warn) 35%, var(--bp-border))" : "var(--bp-border)"}`,
  color: "var(--bp-ink)",
  wordBreak: "break-word",
});

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--bp-muted)",
  marginBottom: 6,
};

function FieldRow({ label, prev, curr }: { label: string; prev: React.ReactNode; curr: React.ReactNode }) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <div className="bp-diff-row">
        <div style={cellStyle(false)}>{prev ?? <span style={{ opacity: 0.4 }}>—</span>}</div>
        <div style={cellStyle(true)}>{curr ?? <span style={{ opacity: 0.4 }}>—</span>}</div>
      </div>
    </div>
  );
}

function UnchangedFieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <div style={cellStyle(false)}>{value ?? <span style={{ opacity: 0.4 }}>—</span>}</div>
    </div>
  );
}

function StringListDiff({ prev, curr }: { prev: string[]; curr: string[] }) {
  const removed = prev.filter((v) => !curr.includes(v));
  const added = curr.filter((v) => !prev.includes(v));
  const kept = curr.filter((v) => prev.includes(v));

  if (removed.length === 0 && added.length === 0) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {kept.map((v) => (
          <span key={v} style={{ padding: "2px 8px", borderRadius: 6, background: "var(--bp-panel)", border: "1px solid var(--bp-border)", fontSize: 12 }}>{v}</span>
        ))}
        {kept.length === 0 && <span style={{ opacity: 0.4, fontSize: 12 }}>—</span>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {removed.map((v) => (
        <span key={v} style={{ padding: "2px 8px", borderRadius: 6, background: "color-mix(in oklab, var(--bp-danger) 12%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-danger) 35%, var(--bp-border))", fontSize: 12, textDecoration: "line-through", color: "var(--bp-danger)" }}>{v}</span>
      ))}
      {kept.map((v) => (
        <span key={v} style={{ padding: "2px 8px", borderRadius: 6, background: "var(--bp-panel)", border: "1px solid var(--bp-border)", fontSize: 12 }}>{v}</span>
      ))}
      {added.map((v) => (
        <span key={v} style={{ padding: "2px 8px", borderRadius: 6, background: "color-mix(in oklab, var(--bp-success) 12%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-success) 35%, var(--bp-border))", fontSize: 12, color: "var(--bp-success)" }}>{v}</span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task refs diff
// ---------------------------------------------------------------------------

function TaskRefsDiff({ prev, curr }: { prev: TaskRef[]; curr: TaskRef[] }) {
  const prevIds = prev.map((r) => r.task_record_id);
  const currIds = curr.map((r) => r.task_record_id);
  const removed = prevIds.filter((id) => !currIds.includes(id));
  const added = currIds.filter((id) => !prevIds.includes(id));
  const kept = currIds.filter((id) => prevIds.includes(id));

  const isReordered = kept.length > 0 && JSON.stringify(
    prev.filter((r) => kept.includes(r.task_record_id)).map((r) => r.task_record_id)
  ) !== JSON.stringify(
    curr.filter((r) => kept.includes(r.task_record_id)).map((r) => r.task_record_id)
  );

  if (removed.length === 0 && added.length === 0 && !isReordered) {
    return (
      <div style={{ fontSize: 13, color: "var(--bp-muted)" }}>
        {curr.length === 0 ? "No tasks." : `${curr.length} task${curr.length === 1 ? "" : "s"} — unchanged.`}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {isReordered && (
        <p style={{ fontSize: 12, color: "var(--bp-warn)", margin: 0 }}>Order changed</p>
      )}
      {removed.map((id) => (
        <div key={id} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid color-mix(in oklab, var(--bp-danger) 35%, var(--bp-border))", background: "color-mix(in oklab, var(--bp-danger) 8%, var(--bp-panel))", fontSize: 13 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "var(--bp-danger)" }}>Removed · </span>
          <Link to={`/tasks/${id}/1`} className="bp-link" style={{ fontSize: 12 }}>{id}</Link>
        </div>
      ))}
      {curr.map((ref) => {
        const isAdded = added.includes(ref.task_record_id);
        return (
          <div key={ref.task_record_id} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${isAdded ? "color-mix(in oklab, var(--bp-success) 35%, var(--bp-border))" : "var(--bp-border)"}`, background: isAdded ? "color-mix(in oklab, var(--bp-success) 8%, var(--bp-panel))" : "var(--bp-panel)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            {isAdded && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "var(--bp-success)" }}>Added · </span>}
            <span style={{ fontSize: 12, color: "var(--bp-muted)" }}>#{ref.order_index + 1}</span>
            <Link to={`/tasks/${ref.task_record_id}/1`} className="bp-link" style={{ fontSize: 12 }}>{ref.task_record_id}</Link>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Principle refs diff
// ---------------------------------------------------------------------------

function PrincipleRefsDiff({ prev, curr }: { prev: PrincipleRef[]; curr: PrincipleRef[] }) {
  const prevIds = prev.map((r) => r.principle_record_id);
  const currIds = curr.map((r) => r.principle_record_id);
  const removed = prevIds.filter((id) => !currIds.includes(id));
  const added = currIds.filter((id) => !prevIds.includes(id));

  if (removed.length === 0 && added.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "var(--bp-muted)" }}>
        {curr.length === 0 ? "No principles." : `${curr.length} principle${curr.length === 1 ? "" : "s"} — unchanged.`}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {removed.map((id) => (
        <div key={id} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid color-mix(in oklab, var(--bp-danger) 35%, var(--bp-border))", background: "color-mix(in oklab, var(--bp-danger) 8%, var(--bp-panel))", fontSize: 13 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "var(--bp-danger)" }}>Removed · </span>
          <Link to={`/principles/${id}`} className="bp-link" style={{ fontSize: 12 }}>{id}</Link>
        </div>
      ))}
      {curr.map((ref) => {
        const isAdded = added.includes(ref.principle_record_id);
        return (
          <div key={ref.principle_record_id} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${isAdded ? "color-mix(in oklab, var(--bp-success) 35%, var(--bp-border))" : "var(--bp-border)"}`, background: isAdded ? "color-mix(in oklab, var(--bp-success) 8%, var(--bp-panel))" : "var(--bp-panel)", fontSize: 13 }}>
            {isAdded && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "var(--bp-success)" }}>Added · </span>}
            <Link to={`/principles/${ref.principle_record_id}`} className="bp-link" style={{ fontSize: 12 }}>{ref.principle_record_id}</Link>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function WorkflowDiffPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["workflows", id, "diff"],
    queryFn: () => api.get<WorkflowDiff>(`/workflows/${id}/diff`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="bp-page">
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading diff…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bp-page">
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Could not load diff.</p>
        <Link to={`/workflows/${id}`} className="bp-link" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={14} /> Back to workflow
        </Link>
      </div>
    );
  }

  const { current, previous } = data;

  const markdownFields = new Set<keyof WorkflowSnapshot>(["objective"]);

  const fields: Array<{ key: keyof WorkflowSnapshot; label: string }> = [
    { key: "title", label: "Title" },
    { key: "objective", label: "Objective" },
    { key: "domain", label: "Domain" },
  ];

  function renderFieldValue(key: keyof WorkflowSnapshot, raw: string | null): React.ReactNode {
    if (raw == null) return null;
    return markdownFields.has(key) ? <MarkdownBody style={{ fontSize: 13 }}>{raw}</MarkdownBody> : raw;
  }

  return (
    <div className="bp-page" style={{ maxWidth: 820 }}>
      <div className="bp-crumbs">
        <Link to={`/workflows/${id}`} className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Back to workflow
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <h1>{current.title}</h1>
          <p className="bp-page__sub">Changes in v{current.version} vs v{previous.version}</p>
        </div>
      </div>

      {/* Version header row */}
      <div className="bp-diff-row">
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bp-panel)", border: "1px solid var(--bp-border)" }}>
          <p style={{ ...labelStyle, marginBottom: 2 }}>Previous</p>
          <span style={{ fontSize: 13, fontWeight: 600 }}>v{previous.version}</span>
          <span style={{ marginLeft: 8 }}><StatusBadge status={previous.status} /></span>
        </div>
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "color-mix(in oklab, var(--bp-accent) 8%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-accent) 25%, var(--bp-border))" }}>
          <p style={{ ...labelStyle, marginBottom: 2 }}>Current</p>
          <span style={{ fontSize: 13, fontWeight: 600 }}>v{current.version}</span>
          <span style={{ marginLeft: 8 }}><StatusBadge status={current.status} /></span>
        </div>
      </div>

      {/* Change note */}
      {current.change_note && (
        <div style={{ background: "color-mix(in oklab, var(--bp-accent) 10%, var(--bp-panel))", border: "1px solid color-mix(in oklab, var(--bp-accent) 35%, var(--bp-border))", borderRadius: 12, padding: "10px 14px" }}>
          <p style={{ ...labelStyle, marginBottom: 4 }}>Revision note</p>
          <p style={{ fontSize: 13, margin: 0, color: "var(--bp-ink)" }}>{current.change_note}</p>
        </div>
      )}

      {/* Scalar fields */}
      <section className="bp-card" style={{ padding: 18 }}>
        <div className="bp-section-head"><h3>Details</h3></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {fields.map(({ key, label }) => {
            const isChanged = changed(current[key], previous[key]);
            const prevRaw = (previous[key] as string) ?? null;
            const currRaw = (current[key] as string) ?? null;
            return isChanged ? (
              <FieldRow key={key} label={label} prev={renderFieldValue(key, prevRaw)} curr={renderFieldValue(key, currRaw)} />
            ) : (
              <UnchangedFieldRow key={key} label={label} value={renderFieldValue(key, currRaw)} />
            );
          })}
        </div>
      </section>

      {/* Tags */}
      {(changed(current.tags, previous.tags) || current.tags.length > 0) && (
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head"><h3>Tags</h3></div>
          <StringListDiff prev={previous.tags} curr={current.tags} />
        </section>
      )}

      {/* Task refs */}
      <section className="bp-card" style={{ padding: 18 }}>
        <div className="bp-section-head"><h3>Tasks</h3></div>
        <TaskRefsDiff prev={previous.task_refs} curr={current.task_refs} />
      </section>

      {/* Principle refs */}
      {(current.principle_refs.length > 0 || previous.principle_refs.length > 0) && (
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head"><h3>Principles</h3></div>
          <PrincipleRefsDiff prev={previous.principle_refs} curr={current.principle_refs} />
        </section>
      )}
    </div>
  );
}
