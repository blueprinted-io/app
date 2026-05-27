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

interface PrincipleSummary {
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

export function PrinciplesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["principles"],
    queryFn: () => api.get<PrincipleSummary[]>("/principles"),
  });

  return (
    <div className="bp-page">
      <div className="bp-page__head">
        <div>
          <h1>Principles</h1>
          <p className="bp-page__sub">All principles across your assigned domains.</p>
        </div>
        <div className="bp-page__actions">
          <Link to="/principles/new" className="bp-btn bp-btn--secondary">
            + New principle
          </Link>
        </div>
      </div>

      {isLoading && (
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading principles…</p>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Failed to load principles.</p>
      )}

      {data && data.length === 0 && (
        <p className="bp-muted" style={{ fontSize: 13 }}>No principles yet.</p>
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
            {data.map((principle) => (
              <TableRow key={principle.id}>
                <TableCell>
                  <Link
                    to={`/principles/${principle.id}`}
                    style={{ fontWeight: 600, color: "var(--bp-ink)" }}
                  >
                    {principle.title}
                  </Link>
                </TableCell>
                <TableCell>{principle.domain}</TableCell>
                <TableCell>v{principle.version}</TableCell>
                <TableCell>
                  <StatusBadge status={principle.status} />
                </TableCell>
                <TableCell>{formatDate(principle.updated_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
