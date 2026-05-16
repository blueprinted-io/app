import { Link } from "react-router-dom";
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

export function TasksPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<TaskSummary[]>("/tasks"),
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
      <p className="mt-1 text-sm text-gray-500">
        All tasks across your assigned domains.
      </p>

      <div className="mt-8">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
            Loading tasks…
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">Failed to load tasks.</p>
        )}

        {data && data.length === 0 && (
          <p className="text-sm text-gray-500">No tasks yet.</p>
        )}

        {data && data.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white">
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
                  <TableRow key={task.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Link
                        to={`/tasks/${task.record_id}`}
                        className="font-medium text-gray-900 hover:text-brand-amber"
                      >
                        {task.title}
                      </Link>
                      {task.software_name && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {task.software_name}
                          {task.software_version ? ` ${task.software_version}` : ""}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500">{task.domain}</TableCell>
                    <TableCell className="text-gray-400 text-sm">v{task.version}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[task.status] ?? "outline"}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(task.updated_at)}
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
