import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskStepAction {
  id: string;
  order_index: number;
  instruction: string;
}

interface TaskStepImage {
  id: string;
  order_index: number;
  storage_path: string;
  caption: string | null;
}

interface TaskStep {
  id: string;
  order_index: number;
  step: string;
  completion: string;
  notes: string | null;
  irreversible: boolean;
  actions: TaskStepAction[];
  images: TaskStepImage[];
}

interface TaskDetail {
  id: string;
  record_id: string;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
  title: string;
  outcome: string;
  domain: string;
  software_name: string | null;
  software_version: string | null;
  media_url: string | null;
  facts: string[];
  concepts: string[];
  tags: string[];
  steps: TaskStep[];
  irreversible: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  submitted: "secondary",
  confirmed: "default",
  returned: "destructive",
  deprecated: "outline",
  retired: "outline",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StepCard({ step, index }: { step: TaskStep; index: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-4">
          {/* Step intent */}
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-gray-900">{step.step}</p>
            {step.irreversible && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Irreversible
              </span>
            )}
          </div>

          {/* Actions */}
          {step.actions.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                How
              </p>
              <ol className="space-y-1">
                {step.actions.map((a) => (
                  <li key={a.id} className="flex gap-2 text-sm text-gray-700">
                    <span className="shrink-0 text-gray-400">{a.order_index + 1}.</span>
                    <span className="font-mono">{a.instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Notes */}
          {step.notes && (
            <div className="rounded-md bg-blue-50 px-3 py-2.5">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-500 mb-1">
                Note
              </p>
              <p className="text-sm text-blue-800">{step.notes}</p>
            </div>
          )}

          {/* Completion criterion */}
          <div className="rounded-md bg-green-50 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-green-600 mb-1">
              Done when
            </p>
            <p className="text-sm text-green-900">{step.completion}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TaskDetailPage() {
  const { recordId, version } = useParams<{ recordId: string; version: string }>();

  const { data: task, isLoading, error } = useQuery({
    queryKey: ["tasks", recordId, version],
    queryFn: () => api.get<TaskDetail>(`/tasks/${recordId}/${version}`),
    enabled: !!recordId && !!version,
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
        Loading task…
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Task not found or failed to load.</p>
        <Link to="/tasks" className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Back link */}
      <Link
        to="/tasks"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Tasks
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant={STATUS_VARIANT[task.status] ?? "outline"}>{task.status}</Badge>
          <span className="text-sm text-gray-400">v{task.version}</span>
          {task.irreversible && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Contains irreversible steps
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>{task.domain}</span>
          {task.software_name && (
            <span>
              {task.software_name}
              {task.software_version ? ` ${task.software_version}` : ""}
            </span>
          )}
          <span>Updated {formatDate(task.updated_at)}</span>
        </div>
      </div>

      <div className="space-y-8">
        {/* Outcome */}
        <Section title="Outcome">
          <p className="text-gray-700">{task.outcome}</p>
        </Section>

        {/* Steps */}
        {task.steps.length > 0 && (
          <Section title={`Steps (${task.steps.length})`}>
            <div className="space-y-3">
              {task.steps
                .slice()
                .sort((a, b) => a.order_index - b.order_index)
                .map((step, i) => (
                  <StepCard key={step.id} step={step} index={i} />
                ))}
            </div>
          </Section>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <Section title="Tags">
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </Section>
        )}

        {/* Facts */}
        {task.facts.length > 0 && (
          <Section title="Facts">
            <ul className="space-y-1">
              {task.facts.map((fact, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="shrink-0 text-gray-400">·</span>
                  {fact}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Concepts */}
        {task.concepts.length > 0 && (
          <Section title="Concepts">
            <ul className="space-y-1">
              {task.concepts.map((concept, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="shrink-0 text-gray-400">·</span>
                  {concept}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Metadata */}
        <Section title="Details">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-400">Created</dt>
              <dd className="text-gray-700">{formatDate(task.created_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Last updated</dt>
              <dd className="text-gray-700">{formatDate(task.updated_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Version</dt>
              <dd className="text-gray-700">v{task.version}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Record ID</dt>
              <dd className="font-mono text-xs text-gray-500 truncate">{task.record_id}</dd>
            </div>
          </dl>
        </Section>
      </div>
    </div>
  );
}
