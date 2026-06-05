import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Relationship {
  id: string;
  source_id: string;
  source_type: string;
  target_id: string;
  target_type: string;
  kind: string;
  created_at: string;
  agent_suggested: boolean;
  note: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RelationshipsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["relationships"],
    queryFn: () => api.get<Relationship[]>("/relationships"),
  });

  return (
    <div className="bp-page">
      <div className="bp-page__head">
        <div>
          <h1>Relationships</h1>
          <p className="bp-page__sub">Explicit links between governed records.</p>
        </div>
      </div>

      {isLoading && (
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading…</p>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Failed to load relationships.</p>
      )}

      {data && data.length === 0 && (
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <p className="bp-muted" style={{ fontSize: 14 }}>No relationships yet.</p>
          <p className="bp-muted" style={{ fontSize: 13, marginTop: 4 }}>
            Relationship authoring is not available in v1. Links will appear here once relationship kinds are defined.
          </p>
        </div>
      )}

      {data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((rel) => (
              <TableRow key={rel.id}>
                <TableCell style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {rel.source_type}/{rel.source_id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <span style={{ padding: "2px 8px", borderRadius: 4, background: "var(--bp-panel)", border: "1px solid var(--bp-border)", fontSize: 12 }}>
                    {rel.kind}
                  </span>
                </TableCell>
                <TableCell style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {rel.target_type}/{rel.target_id.slice(0, 8)}
                </TableCell>
                <TableCell>{formatDate(rel.created_at)}</TableCell>
                <TableCell className="bp-muted" style={{ fontSize: 13 }}>{rel.note ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
