import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Globe, Code } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

interface IngestionResponse {
  id: string;
}

type SourceType = "pdf" | "html" | "json";

// ---------------------------------------------------------------------------
// PDF tab
// ---------------------------------------------------------------------------

function PdfForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setIsPending(true);

    try {
      const token = await getAccessToken();
      const form = new FormData();
      form.append("file", file);

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch("/api/v1/ingestions", {
        method: "POST",
        headers,
        body: form,
      });

      if (!response.ok) {
        let detail = response.statusText;
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) detail = body.detail;
        } catch { /* ignore */ }
        throw new ApiError(response.status, detail);
      }

      const data = (await response.json()) as IngestionResponse;
      onSuccess(data.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label className="bp-label">PDF file</label>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ display: "block", width: "100%", fontSize: 13, color: "var(--bp-muted)" }}
        />
      </div>
      {error && <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>{error}</p>}
      <button type="submit" className="bp-btn bp-btn--secondary" disabled={!file || isPending} style={{ alignSelf: "flex-start" }}>
        {isPending ? "Uploading…" : "Upload PDF"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// HTML tab
// ---------------------------------------------------------------------------

function HtmlForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"single" | "site-nav">("single");
  const [force, setForce] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setIsPending(true);
    try {
      const data = await api.post<IngestionResponse>("/ingestions/html", { url: url.trim(), mode, force });
      onSuccess(data.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start HTML ingestion.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label className="bp-label">URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/docs"
          className="bp-input"
        />
      </div>
      <div>
        <label className="bp-label" style={{ marginBottom: 8 }}>Mode</label>
        <div style={{ display: "flex", gap: 16 }}>
          {(["single", "site-nav"] as const).map((m) => (
            <label key={m} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--bp-ink)", cursor: "pointer" }}>
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                style={{ accentColor: "var(--bp-accent)" }}
              />
              {m === "single" ? "Single page" : "Site navigation"}
            </label>
          ))}
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--bp-ink)", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={force}
          onChange={(e) => setForce(e.target.checked)}
          style={{ accentColor: "var(--bp-accent)" }}
        />
        Re-ingest even if URL was previously imported
      </label>
      {error && <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>{error}</p>}
      <button type="submit" className="bp-btn bp-btn--secondary" disabled={!url.trim() || isPending} style={{ alignSelf: "flex-start" }}>
        {isPending ? "Starting…" : "Start HTML import"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// JSON tab
// ---------------------------------------------------------------------------

function JsonForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const [text, setText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("Invalid JSON.");
      return;
    }

    const body = parsed as { schema_version?: string; items?: unknown[] };
    if (body.schema_version !== "1.0" || !Array.isArray(body.items)) {
      setError('JSON must have schema_version "1.0" and an items array.');
      return;
    }

    setIsPending(true);
    try {
      const data = await api.post<IngestionResponse>("/ingestions/json", parsed);
      onSuccess(data.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to import JSON.");
    } finally {
      setIsPending(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label className="bp-label">JSON file</label>
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          style={{ display: "block", width: "100%", fontSize: 13, color: "var(--bp-muted)" }}
        />
      </div>
      <div>
        <label className="bp-label">Or paste JSON</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder='{ "schema_version": "1.0", "items": [...] }'
          style={{ display: "block", width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid var(--bp-border)", background: "var(--bp-panel)", color: "var(--bp-ink)", fontSize: 12, fontFamily: "ui-monospace, monospace", padding: "7px 10px", outline: "none" }}
        />
      </div>
      {error && <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>{error}</p>}
      <button type="submit" className="bp-btn bp-btn--secondary" disabled={!text.trim() || isPending} style={{ alignSelf: "flex-start" }}>
        {isPending ? "Importing…" : "Import JSON"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TABS: { key: SourceType; label: string; Icon: React.ElementType }[] = [
  { key: "pdf", label: "PDF", Icon: FileText },
  { key: "html", label: "HTML / URL", Icon: Globe },
  { key: "json", label: "JSON", Icon: Code },
];

export function IngestionCreatePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SourceType>("pdf");

  function onSuccess(id: string) {
    navigate(`/ingestion/${id}`);
  }

  return (
    <div className="bp-page" style={{ maxWidth: 620 }}>
      <div className="bp-crumbs">
        <Link to="/ingestion" className="bp-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={12} /> Ingestion
        </Link>
      </div>

      <div className="bp-page__head">
        <div>
          <h1>New import</h1>
          <p className="bp-page__sub">Choose a source type and provide the details below.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--bp-border)", marginBottom: 20 }}>
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", fontSize: 13, fontWeight: 500,
              marginBottom: -1,
              color: activeTab === key ? "var(--bp-accent-deep)" : "var(--bp-muted)",
              background: "none", border: "none",
              borderBottom: activeTab === key ? "2px solid var(--bp-accent)" : "2px solid transparent",
              cursor: "pointer", transition: "color .15s ease",
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="bp-card" style={{ padding: 20 }}>
        {activeTab === "pdf" && <PdfForm onSuccess={onSuccess} />}
        {activeTab === "html" && <HtmlForm onSuccess={onSuccess} />}
        {activeTab === "json" && <JsonForm onSuccess={onSuccess} />}
      </div>
    </div>
  );
}
