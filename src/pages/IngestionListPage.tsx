import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Globe, Code, Trash2 } from "lucide-react";
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

interface IngestionSummary {
  id: string;
  source_type: string;
  status: string;
  original_filename: string | null;
  source_url: string | null;
  chunk_count: number | null;
  created_at: string;
}

const SOURCE_ICON: Record<string, React.ElementType> = {
  pdf: FileText,
  html: Globe,
  json: Code,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sourceLabel(ing: IngestionSummary): string {
  if (ing.source_type === "pdf") return ing.original_filename ?? "PDF";
  if (ing.source_type === "html") return ing.source_url ?? "HTML";
  return "JSON import";
}

export function IngestionListPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ingestions"],
    queryFn: () => api.get<IngestionSummary[]>("/ingestions"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ingestions/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["ingestions"] }),
  });

  return (
    <div className="bp-page">
      <div className="bp-page__head">
        <div>
          <h1>Ingestion</h1>
          <p className="bp-page__sub">Import documents and review extracted candidates.</p>
        </div>
        <Link to="/ingestion/new" className="bp-btn bp-btn--secondary">
          <Plus size={14} /> New import
        </Link>
      </div>

      {isLoading && <p className="bp-muted" style={{ fontSize: 13 }}>Loading…</p>}
      {error && <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Failed to load ingestion history.</p>}

      {data && data.length === 0 && (
        <p className="bp-muted" style={{ fontSize: 13 }}>No imports yet. Start one above.</p>
      )}

      {data && data.length > 0 && (
        <div className="bp-card" style={{ overflow: "hidden" }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((ing) => {
                const Icon = SOURCE_ICON[ing.source_type] ?? FileText;
                return (
                  <TableRow key={ing.id}>
                    <TableCell>
                      <Link
                        to={`/ingestion/${ing.id}`}
                        className="bp-link"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500 }}
                      >
                        <Icon size={14} style={{ flexShrink: 0, color: "var(--bp-muted)" }} />
                        <span style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sourceLabel(ing)}</span>
                      </Link>
                    </TableCell>
                    <TableCell style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--bp-muted)" }}>
                      {ing.source_type}
                    </TableCell>
                    <TableCell><StatusBadge status={ing.status} /></TableCell>
                    <TableCell style={{ fontSize: 13, color: "var(--bp-muted)" }}>{ing.chunk_count ?? "—"}</TableCell>
                    <TableCell style={{ fontSize: 13, color: "var(--bp-muted)" }}>{formatDate(ing.created_at)}</TableCell>
                    <TableCell style={{ textAlign: "right" }}>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${sourceLabel(ing)}"?`)) {
                            deleteMutation.mutate(ing.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--bp-muted)", display: "inline-flex", alignItems: "center", borderRadius: 6 }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
