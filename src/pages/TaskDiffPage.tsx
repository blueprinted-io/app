import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepAction {
  id: string;
  order_index: number;
  instruction: string;
}

interface Step {
  id: string;
  order_index: number;
  step: string;
  completion: string;
  notes: string | null;
  irreversible: boolean;
  actions: StepAction[];
}

interface TaskSnapshot {
  id: string;
  record_id: string;
  version: number;
  status: string;
  title: string;
  outcome: string;
  domain: string;
  software_name: string | null;
  software_version: string | null;
  facts: string[];
  concepts: string[];
  tags: string[];
  steps: Step[];
  change_note: string | null;
}

interface TaskDiff {
  current: TaskSnapshot;
  previous: TaskSnapshot;
}

// ---------------------------------------------------------------------------
// Diff primitives
// ---------------------------------------------------------------------------

function changed(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

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
  whiteSpace: "pre-wrap",
});

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--bp-muted)",
  marginBottom: 6,
};

function FieldRow({
  label,
  prev,
  curr,
}: {
  label: string;
  prev: React.ReactNode;
  curr: React.ReactNode;
}) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <div style={rowStyle}>
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
// Steps diff
// ---------------------------------------------------------------------------

function StepsDiff({ prev, curr }: { prev: Step[]; curr: Step[] }) {
  const prevIds = new Set(prev.map((s) => s.id));
  const currIds = new Set(curr.map((s) => s.id));
  const removed = prev.filter((s) => !currIds.has(s.id));
  const added = curr.filter((s) => !prevIds.has(s.id));
  const shared = curr.filter((s) => prevIds.has(s.id));

  if (removed.length === 0 && added.length === 0 && shared.every((s) => {
    const p = prev.find((x) => x.id === s.id)!;
    return !changed(s, p);
  })) {
    return (
      <div style={{ fontSize: 13, color: "var(--bp-muted)" }}>
        {curr.length === 0 ? "No steps." : `${curr.length} step${curr.length === 1 ? "" : "s"} — unchanged.`}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {removed.map((s) => (
        <div key={s.id} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid color-mix(in oklab, var(--bp-danger) 35%, var(--bp-border))", background: "color-mix(in oklab, var(--bp-danger) 8%, var(--bp-panel))", fontSize: 13 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--bp-danger)" }}>Removed</span>
          <p style={{ margin: "4px 0 0", color: "var(--bp-ink)" }}>{s.step}</p>
        </div>
      ))}
      {shared.map((s) => {
        const p = prev.find((x) => x.id === s.id)!;
        const isChanged = changed(s, p);
        return (
          <div key={s.id} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${isChanged ? "color-mix(in oklab, var(--bp-warn) 35%, var(--bp-border))" : "var(--bp-border)"}`, background: isChanged ? "color-mix(in oklab, var(--bp-warn) 8%, var(--bp-panel))" : "var(--bp-panel)", fontSize: 13 }}>
            {isChanged && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--bp-warn)" }}>Modified</span>}
            <p style={{ margin: isChanged ? "4px 0 0" : 0, color: "var(--bp-ink)" }}>{s.step}</p>
          </div>
        );
      })}
      {added.map((s) => (
        <div key={s.id} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid color-mix(in oklab, var(--bp-success) 35%, var(--bp-border))", background: "color-mix(in oklab, var(--bp-success) 8%, var(--bp-panel))", fontSize: 13 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--bp-success)" }}>Added</span>
          <p style={{ margin: "4px 0 0", color: "var(--bp-ink)" }}>{s.step}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TaskDiffPage() {
  const { recordId, version } = useParams<{ recordId: string; version: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", recordId, version, "diff"],
    queryFn: () => api.get<TaskDiff>(`/tasks/${recordId}/${version}/diff`),
    enabled: !!recordId && !!version,
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
        <Link to={`/tasks/${recordId}/${version}`} className="bp-link" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={14} /> Back to task
        </Link>
      </div>
    );
  }

  const { current, previous } = data;

  const fields: Array<{ key: keyof TaskSnapshot; label: string }> = [
    { key: "title", label: "Title" },
    { key: "outcome", label: "Outcome" },
    { key: "domain", label: "Domain" },
    { key: "software_name", label: "Software" },
    { key: "software_version", label: "Version" },
  ];

  return (
    <div className="bp-page" style={{ maxWidth: 820 }}>
      <div className="bp-crumbs">
        <Link to={`/tasks/${recordId}/${version}`} className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Back to task
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <h1>{current.title}</h1>
          <p className="bp-page__sub">
            Changes in v{current.version} vs v{previous.version}
          </p>
        </div>
      </div>

      {/* Version header row */}
      <div style={rowStyle}>
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
            return isChanged ? (
              <FieldRow
                key={key}
                label={label}
                prev={previous[key] as string ?? null}
                curr={current[key] as string ?? null}
              />
            ) : (
              <UnchangedFieldRow key={key} label={label} value={current[key] as string ?? null} />
            );
          })}
        </div>
      </section>

      {/* Facts */}
      {(changed(current.facts, previous.facts) || current.facts.length > 0) && (
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head"><h3>Facts</h3></div>
          <StringListDiff prev={previous.facts} curr={current.facts} />
        </section>
      )}

      {/* Concepts */}
      {(changed(current.concepts, previous.concepts) || current.concepts.length > 0) && (
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head"><h3>Concepts</h3></div>
          <StringListDiff prev={previous.concepts} curr={current.concepts} />
        </section>
      )}

      {/* Tags */}
      {(changed(current.tags, previous.tags) || current.tags.length > 0) && (
        <section className="bp-card" style={{ padding: 18 }}>
          <div className="bp-section-head"><h3>Tags</h3></div>
          <StringListDiff prev={previous.tags} curr={current.tags} />
        </section>
      )}

      {/* Steps */}
      <section className="bp-card" style={{ padding: 18 }}>
        <div className="bp-section-head"><h3>Procedure</h3></div>
        <StepsDiff prev={previous.steps} curr={current.steps} />
      </section>
    </div>
  );
}
