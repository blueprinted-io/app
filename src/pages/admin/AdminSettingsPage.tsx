import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Setting {
  key: string;
  value: string | null;
  encrypted: boolean;
  updated_at: string;
}

interface TestResult {
  ok: boolean;
  models: string[];
  error: string | null;
}

// Each LLM section groups base_url + model + api_key + optional timeout.
interface LLMSection {
  title: string;
  desc?: string;
  baseUrlKey: string;
  modelKey: string;
  apiKeyKey: string;
  timeoutKey?: string;
}

const LLM_SECTIONS: LLMSection[] = [
  {
    title: "Shared Fallback",
    desc: "All pipelines inherit these when their own settings are blank.",
    baseUrlKey: "llm_base_url",
    modelKey: "llm_model",
    apiKeyKey: "llm_api_key",
  },
  {
    title: "Triage",
    baseUrlKey: "llm_triage_base_url",
    modelKey: "llm_triage_model",
    apiKeyKey: "llm_triage_api_key",
    timeoutKey: "llm_triage_timeout_seconds",
  },
  {
    title: "Extraction",
    baseUrlKey: "llm_extraction_base_url",
    modelKey: "llm_extraction_model",
    apiKeyKey: "llm_extraction_api_key",
    timeoutKey: "llm_extraction_timeout_seconds",
  },
  {
    title: "Embedding",
    baseUrlKey: "llm_embedding_base_url",
    modelKey: "llm_embedding_model",
    apiKeyKey: "llm_embedding_api_key",
    timeoutKey: "llm_embedding_timeout_seconds",
  },
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
  // testResults keyed by baseUrlKey
  const [testResults, setTestResults] = useState<Record<string, TestResult | "loading">>({});

  const { data: settings, isLoading } = useQuery<Setting[]>({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<Setting[]>("/admin/settings"),
  });

  const saveMutation = useMutation({
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

  function setEdit(key: string, value: string) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  async function handleTestConnection(section: LLMSection) {
    const baseUrl = currentVal(section.baseUrlKey);
    if (!baseUrl) return;

    setTestResults((prev) => ({ ...prev, [section.baseUrlKey]: "loading" }));

    const apiKey = edits[section.apiKeyKey] ?? "";
    const result = await api.post<TestResult>("/admin/settings/test-connection", {
      base_url: baseUrl,
      api_key: apiKey,
      api_key_setting: apiKey ? "" : section.apiKeyKey,
    });

    setTestResults((prev) => ({ ...prev, [section.baseUrlKey]: result }));
  }

  function handleModelPick(modelKey: string, model: string) {
    setEdit(modelKey, model);
  }

  function handleSave() {
    const allKeys = [
      ...LLM_SECTIONS.flatMap((s) => [
        { key: s.baseUrlKey, encrypted: false },
        { key: s.modelKey, encrypted: false },
        { key: s.apiKeyKey, encrypted: true },
        ...(s.timeoutKey ? [{ key: s.timeoutKey, encrypted: false }] : []),
      ]),
      ...OTHER_KEYS.map((k) => ({ key: k.key, encrypted: k.encrypted ?? false })),
    ];
    const patch: Record<string, { value: string; encrypted: boolean }> = {};
    for (const { key, encrypted } of allKeys) {
      if (key in edits && edits[key] !== "") {
        patch[key] = { value: edits[key], encrypted };
      }
    }
    if (Object.keys(patch).length > 0) saveMutation.mutate(patch);
  }

  function InputRow({
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
      ? existing?.value !== null
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
          onChange={(e) => setEdit(k, e.target.value)}
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
          Configure providers for each pipeline stage. Leave fields blank to inherit the shared
          fallback.
        </p>
        <div className="space-y-4">
          {LLM_SECTIONS.map((section) => (
            <LLMSectionCard
              key={section.baseUrlKey}
              section={section}
              currentVal={currentVal}
              setEdit={setEdit}
              settingMap={settingMap}
              testResult={testResults[section.baseUrlKey]}
              onTest={() => void handleTestConnection(section)}
              onModelPick={(model) => handleModelPick(section.modelKey, model)}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Other Settings</h2>
        <div className="divide-y divide-gray-100 rounded border border-gray-200 bg-white px-4">
          {OTHER_KEYS.map(({ key, label }) => (
            <InputRow key={key} k={key} label={label} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending || Object.keys(edits).length === 0}
        >
          {saveMutation.isPending ? "Saving…" : "Save settings"}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
        {saveMutation.isError && (
          <span className="text-sm text-red-600">{(saveMutation.error as Error).message}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LLM section card
// ---------------------------------------------------------------------------

function LLMSectionCard({
  section,
  currentVal,
  setEdit,
  settingMap,
  testResult,
  onTest,
  onModelPick,
}: {
  section: LLMSection;
  currentVal: (key: string) => string;
  setEdit: (key: string, value: string) => void;
  settingMap: Record<string, Setting>;
  testResult: TestResult | "loading" | undefined;
  onTest: () => void;
  onModelPick: (model: string) => void;
}) {
  const baseUrl = currentVal(section.baseUrlKey);
  const fetchedModels = testResult !== "loading" ? (testResult?.models ?? []) : [];
  const testOk = testResult !== "loading" && testResult?.ok === true;
  const testError = testResult !== "loading" ? testResult?.error : null;

  return (
    <div className="rounded border border-gray-200 bg-white px-4">
      <p className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {section.title}
        {section.desc && <span className="ml-2 font-normal normal-case text-gray-400">{section.desc}</span>}
      </p>

      {/* Base URL row with Test button */}
      <div className="grid grid-cols-3 items-center gap-4 border-t border-gray-100 py-2">
        <label className="text-sm font-medium text-gray-700">Base URL</label>
        <div className="col-span-2 flex items-center gap-2">
          <input
            type="text"
            className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber"
            value={baseUrl}
            onChange={(e) => setEdit(section.baseUrlKey, e.target.value)}
            autoComplete="off"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onTest}
            disabled={!baseUrl || testResult === "loading"}
            className="shrink-0"
          >
            {testResult === "loading" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Test"
            )}
          </Button>
        </div>
      </div>

      {/* Test result feedback */}
      {testResult && testResult !== "loading" && (
        <div className="flex items-center gap-1.5 pb-1 text-sm">
          {testOk ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-700">
                Connected — {fetchedModels.length} model{fetchedModels.length !== 1 ? "s" : ""} available
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-red-600">{testError ?? "Connection failed"}</span>
            </>
          )}
        </div>
      )}

      {/* Model row — plain input or combined input + picker dropdown when models fetched */}
      <div className="grid grid-cols-3 items-center gap-4 border-t border-gray-100 py-2">
        <label className="text-sm font-medium text-gray-700">Model</label>
        <div className="col-span-2 flex items-center gap-2">
          <input
            type="text"
            className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber"
            value={currentVal(section.modelKey)}
            onChange={(e) => setEdit(section.modelKey, e.target.value)}
            autoComplete="off"
            placeholder={testOk && fetchedModels.length > 0 ? "Type or pick →" : ""}
          />
          {testOk && fetchedModels.length > 0 && (
            <select
              className="shrink-0 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber"
              value=""
              onChange={(e) => {
                if (e.target.value) onModelPick(e.target.value);
              }}
            >
              <option value="">Fetch models</option>
              {fetchedModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* API Key row */}
      <div className="grid grid-cols-3 items-center gap-4 border-t border-gray-100 py-2">
        <label className="text-sm font-medium text-gray-700">API Key</label>
        <input
          type="password"
          className="col-span-2 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber"
          placeholder={
            settingMap[section.apiKeyKey]
              ? "••••••••  (set — enter new value to update)"
              : "Enter API key"
          }
          value={currentVal(section.apiKeyKey)}
          onChange={(e) => setEdit(section.apiKeyKey, e.target.value)}
          autoComplete="off"
        />
      </div>

      {/* Timeout row (optional) */}
      {section.timeoutKey && (
        <div className="grid grid-cols-3 items-center gap-4 border-t border-gray-100 py-2">
          <label className="text-sm font-medium text-gray-700">Timeout (s)</label>
          <input
            type="text"
            className="col-span-2 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber"
            value={currentVal(section.timeoutKey)}
            onChange={(e) => setEdit(section.timeoutKey!, e.target.value)}
            autoComplete="off"
          />
        </div>
      )}
    </div>
  );
}

