import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
    <div className="p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Principles</h1>
          <p className="mt-1 text-sm text-gray-500">
            All principles across your assigned domains.
          </p>
        </div>
        <Link
          to="/principles/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-amber px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New principle
        </Link>
      </div>


      <div className="mt-8">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
            Loading principles…
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">Failed to load principles.</p>
        )}

        {data && data.length === 0 && (
          <p className="text-sm text-gray-500">No principles yet.</p>
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
                {data.map((principle) => (
                  <TableRow key={principle.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Link
                        to={`/principles/${principle.id}`}
                        className="font-medium text-gray-900 hover:text-brand-amber"
                      >
                        {principle.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-500">{principle.domain}</TableCell>
                    <TableCell>
                      <StatusBadge status={principle.status} />
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(principle.updated_at)}
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
