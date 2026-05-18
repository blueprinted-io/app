import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface HealthResponse {
  status: string;
  db_ok: boolean;
  migration_head: string | null;
  undelivered_notification_errors: number;
}

export function AdminHealthPage() {
  const { data, isLoading, error } = useQuery<HealthResponse>({
    queryKey: ["admin-health"],
    queryFn: () => api.get<HealthResponse>("/admin/health"),
    refetchInterval: 30_000,
  });

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">Failed to load health status.</p>;
  if (!data) return null;

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
      <dl className="divide-y divide-gray-100 rounded border border-gray-200 bg-white">
        <Row label="Status">
          <span
            className={
              data.status === "ok" ? "font-medium text-green-600" : "font-medium text-red-600"
            }
          >
            {data.status}
          </span>
        </Row>
        <Row label="Database">
          <span className={data.db_ok ? "text-green-600" : "text-red-600"}>
            {data.db_ok ? "Connected" : "Unreachable"}
          </span>
        </Row>
        <Row label="Migration head">
          <code className="text-xs">{data.migration_head ?? "unknown"}</code>
        </Row>
        <Row label="Notification delivery errors">
          <span
            className={data.undelivered_notification_errors > 0 ? "text-amber-600" : "text-gray-700"}
          >
            {data.undelivered_notification_errors}
          </span>
        </Row>
      </dl>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
