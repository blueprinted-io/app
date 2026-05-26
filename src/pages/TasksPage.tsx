import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TaskSummary {
  id: string;
  record_id: string;
  version: number;
  status: string;
  title: string;
  domain: string;
  software_name: string | null;
  software_version: string | null;
  updated_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TasksPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<TaskSummary[]>("/tasks"),
  });

  return (
    <div className="bp-page">
      <div className="bp-page__head">
        <div>
          <h1>Tasks</h1>
          <p className="bp-page__sub">All tasks across your assigned domains.</p>
        </div>
        <div className="bp-page__actions">
          <Link to="/tasks/new" className="bp-btn bp-btn--secondary">
            + New task
          </Link>
        </div>
      </div>

      {isLoading && (
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading tasks…</p>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Failed to load tasks.</p>
      )}

      {data && data.length === 0 && (
        <p className="bp-muted" style={{ fontSize: 13 }}>No tasks found.</p>
      )}

      {data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Link
                    to={`/tasks/${task.record_id}/${task.version}`}
                    style={{ fontWeight: 600, color: "var(--bp-ink)" }}
                  >
                    {task.title}
                  </Link>
                  {task.software_name && (
                    <p style={{ marginTop: 2, fontSize: 12, color: "var(--bp-muted)" }}>
                      {task.software_name}
                      {task.software_version ? ` ${task.software_version}` : ""}
                    </p>
                  )}
                </TableCell>
                <TableCell>{task.domain}</TableCell>
                <TableCell>v{task.version}</TableCell>
                <TableCell>
                  <StatusBadge status={task.status} />
                </TableCell>
                <TableCell>{formatDate(task.updated_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
