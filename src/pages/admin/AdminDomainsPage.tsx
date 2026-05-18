import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Domain {
  name: string;
  created_at: string;
  created_by: string;
  disabled_at: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminDomainsPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");

  const { data: domains, isLoading } = useQuery<Domain[]>({
    queryKey: ["admin-domains"],
    queryFn: () => api.get<Domain[]>("/admin/domains"),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post<Domain>("/admin/domains", { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-domains"] });
      setNewName("");
      setCreateError("");
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const disableMutation = useMutation({
    mutationFn: (name: string) => api.post<Domain>(`/admin/domains/${name}/disable`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-domains"] }),
  });

  const enableMutation = useMutation({
    mutationFn: (name: string) => api.post<Domain>(`/admin/domains/${name}/enable`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-domains"] }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (newName.trim()) createMutation.mutate(newName.trim());
  }

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Domains</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(domains ?? []).map((d) => (
              <TableRow key={d.name}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{formatDate(d.created_at)}</TableCell>
                <TableCell>
                  {d.disabled_at ? (
                    <Badge variant="outline" className="text-gray-400">
                      Disabled
                    </Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {d.disabled_at ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => enableMutation.mutate(d.name)}
                      disabled={enableMutation.isPending}
                    >
                      Enable
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disableMutation.mutate(d.name)}
                      disabled={disableMutation.isPending}
                    >
                      Disable
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(domains ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-gray-400">
                  No domains yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Create domain</h3>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber"
            placeholder="domain-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" disabled={createMutation.isPending || !newName.trim()}>
            {createMutation.isPending ? "Creating…" : "Create"}
          </Button>
        </form>
        {createError && <p className="mt-1 text-sm text-red-600">{createError}</p>}
      </div>
    </div>
  );
}
