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

interface WorkflowSummary {
  id: string;
  record_id: string;
  version: number;
  status: string;
  title: string;
  domain: string;
  updated_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function WorkflowsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.get<WorkflowSummary[]>("/workflows"),
  });

  return (
    <div className="bp-page">
      <div className="bp-page__head">
        <div>
          <h1>Workflows</h1>
          <p className="bp-page__sub">All workflows across your assigned domains.</p>
        </div>
        <div className="bp-page__actions">
          <Link to="/workflows/new" className="bp-btn bp-btn--secondary">
            + New workflow
          </Link>
        </div>
      </div>

      {isLoading && (
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading workflows…</p>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Failed to load workflows.</p>
      )}

      {data && data.length === 0 && (
        <p className="bp-muted" style={{ fontSize: 13 }}>No workflows yet.</p>
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
            {data.map((workflow) => (
              <TableRow key={workflow.id}>
                <TableCell>
                  <Link
                    to={`/workflows/${workflow.id}`}
                    style={{ fontWeight: 600, color: "var(--bp-ink)" }}
                  >
                    {workflow.title}
                  </Link>
                </TableCell>
                <TableCell>{workflow.domain}</TableCell>
                <TableCell>v{workflow.version}</TableCell>
                <TableCell>
                  <StatusBadge status={workflow.status} />
                </TableCell>
                <TableCell>{formatDate(workflow.updated_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
