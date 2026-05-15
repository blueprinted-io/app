import { useQuery } from "@tanstack/react-query";
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

interface WorkflowSummary {
  id: string;
  record_id: string;
  version: number;
  status: string;
  title: string;
  domain: string;
  updated_at: string;
}

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

export function WorkflowsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.get<WorkflowSummary[]>("/workflows"),
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
      <p className="mt-1 text-sm text-gray-500">
        All workflows across your assigned domains.
      </p>

      <div className="mt-8">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
            Loading workflows…
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">Failed to load workflows.</p>
        )}

        {data && data.length === 0 && (
          <p className="text-sm text-gray-500">No workflows yet.</p>
        )}

        {data && data.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium text-gray-900">
                      {workflow.title}
                    </TableCell>
                    <TableCell className="text-gray-500">{workflow.domain}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[workflow.status] ?? "outline"}>
                        {workflow.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(workflow.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
