import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Globe, Code } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">PDF file</label>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={!file || isPending}>
        {isPending ? "Uploading…" : "Upload PDF"}
      </Button>
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/docs"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
        <div className="flex gap-4">
          {(["single", "site-nav"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="accent-brand-amber"
              />
              {m === "single" ? "Single page" : "Site navigation"}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={force}
          onChange={(e) => setForce(e.target.checked)}
          className="accent-brand-amber"
        />
        Re-ingest even if URL was previously imported
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={!url.trim() || isPending}>
        {isPending ? "Starting…" : "Start HTML import"}
      </Button>
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">JSON file</label>
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Or paste JSON
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder='{ "schema_version": "1.0", "items": [...] }'
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={!text.trim() || isPending}>
        {isPending ? "Importing…" : "Import JSON"}
      </Button>
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
    <div className="p-8 max-w-2xl">
      <Link
        to="/ingestion"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Ingestion
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">New import</h1>
      <p className="text-sm text-gray-500 mb-8">Choose a source type and provide the details below.</p>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-8">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={[
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === key
                ? "border-brand-amber text-brand-amber"
                : "border-transparent text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === "pdf" && <PdfForm onSuccess={onSuccess} />}
        {activeTab === "html" && <HtmlForm onSuccess={onSuccess} />}
        {activeTab === "json" && <JsonForm onSuccess={onSuccess} />}
      </div>
    </div>
  );
}
