import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Setting {
  key: string;
  value: string | null;
  encrypted: boolean;
  updated_at: string;
}

// LLM config keys shown on this page, in display order.
const LLM_KEYS: { key: string; label: string; encrypted?: boolean }[] = [
  { key: "llm_base_url", label: "Base URL (shared fallback)" },
  { key: "llm_model", label: "Model (shared fallback)" },
  { key: "llm_api_key", label: "API Key (shared fallback)", encrypted: true },
  { key: "llm_triage_base_url", label: "Triage Base URL" },
  { key: "llm_triage_model", label: "Triage Model" },
  { key: "llm_triage_api_key", label: "Triage API Key", encrypted: true },
  { key: "llm_triage_timeout_seconds", label: "Triage Timeout (s)" },
  { key: "llm_extraction_base_url", label: "Extraction Base URL" },
  { key: "llm_extraction_model", label: "Extraction Model" },
  { key: "llm_extraction_api_key", label: "Extraction API Key", encrypted: true },
  { key: "llm_extraction_timeout_seconds", label: "Extraction Timeout (s)" },
  { key: "llm_embedding_base_url", label: "Embedding Base URL" },
  { key: "llm_embedding_model", label: "Embedding Model" },
  { key: "llm_embedding_api_key", label: "Embedding API Key", encrypted: true },
  { key: "llm_embedding_timeout_seconds", label: "Embedding Timeout (s)" },
];

const OTHER_KEYS: { key: string; label: string; encrypted?: boolean }[] = [
  { key: "review_claim_expiry_hours", label: "Review Claim Expiry (hours)" },
  { key: "ingestion_pdf_chunk_size_chars", label: "PDF Chunk Size (chars)" },
  { key: "ingestion_html_respect_robots_txt", label: "Respect robots.txt (true/false)" },
];

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery<Setting[]>({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<Setting[]>("/admin/settings"),
  });

  const mutation = useMutation({
    mutationFn: (patch: Record<string, { value: string; encrypted: boolean }>) =>
      api.patch("/admin/settings", { settings: patch }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      setEdits({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  const settingMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s]));

  function currentVal(key: string): string {
    if (key in edits) return edits[key];
    return settingMap[key]?.value ?? "";
  }

  function handleSave() {
    const allKeys = [...LLM_KEYS, ...OTHER_KEYS];
    const patch: Record<string, { value: string; encrypted: boolean }> = {};
    for (const { key, encrypted } of allKeys) {
      if (key in edits && edits[key] !== "") {
        patch[key] = { value: edits[key], encrypted: encrypted ?? false };
      }
    }
    if (Object.keys(patch).length > 0) mutation.mutate(patch);
  }

  function SettingRow({
    k,
    label,
    encrypted,
  }: {
    k: string;
    label: string;
    encrypted?: boolean;
  }) {
    const existing = settingMap[k];
    const placeholder = encrypted
      ? existing
        ? "••••••••  (set — enter new value to update)"
        : "Enter API key"
      : "";
    return (
      <div className="grid grid-cols-3 items-center gap-4 py-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <input
          type={encrypted ? "password" : "text"}
          className="col-span-2 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber"
          placeholder={placeholder}
          value={currentVal(k)}
          onChange={(e) => setEdits((prev) => ({ ...prev, [k]: e.target.value }))}
          autoComplete="off"
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">LLM Configuration</h2>
        <p className="mb-4 text-sm text-gray-500">
          Set base URL, model, and API key for each pipeline stage. Leave blank to inherit the
          shared fallback.
        </p>
        <div className="divide-y divide-gray-100 rounded border border-gray-200 bg-white px-4">
          {LLM_KEYS.map(({ key, label, encrypted }) => (
            <SettingRow key={key} k={key} label={label} encrypted={encrypted} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Other Settings</h2>
        <div className="divide-y divide-gray-100 rounded border border-gray-200 bg-white px-4">
          {OTHER_KEYS.map(({ key, label }) => (
            <SettingRow key={key} k={key} label={label} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={mutation.isPending || Object.keys(edits).length === 0}>
          {mutation.isPending ? "Saving…" : "Save settings"}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
        {mutation.isError && (
          <span className="text-sm text-red-600">
            {(mutation.error as Error).message}
          </span>
        )}
      </div>
    </div>
  );
}
