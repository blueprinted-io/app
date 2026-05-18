import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Globe, Code, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  chunking: "secondary",
  ready: "default",
  failed: "destructive",
};

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
    <div className="p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingestion</h1>
          <p className="mt-1 text-sm text-gray-500">
            Import documents and review extracted candidates.
          </p>
        </div>
        <Link
          to="/ingestion/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-amber px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New import
        </Link>
      </div>

      <div className="mt-8">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
            Loading…
          </div>
        )}

        {error && <p className="text-sm text-red-600">Failed to load ingestion history.</p>}

        {data && data.length === 0 && (
          <p className="text-sm text-gray-500">No imports yet. Start one above.</p>
        )}

        {data && data.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white">
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
                    <TableRow key={ing.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Link
                          to={`/ingestion/${ing.id}`}
                          className="flex items-center gap-2 font-medium text-gray-900 hover:text-brand-amber"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                          <span className="truncate max-w-xs">{sourceLabel(ing)}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-500 uppercase text-xs font-medium">
                        {ing.source_type}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[ing.status] ?? "outline"}>
                          {ing.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {ing.chunk_count ?? "—"}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatDate(ing.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${sourceLabel(ing)}"?`)) {
                              deleteMutation.mutate(ing.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
