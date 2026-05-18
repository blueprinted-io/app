import { useEffect, useState } from "react";
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

interface UserSummary {
  id: string;
  email: string;
  display_name: string | null;
  roles: string[];
  is_active: boolean;
  created_at: string;
}

interface Domain {
  name: string;
  disabled_at: string | null;
}

function roleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "admin") return "default";
  if (role === "contributor") return "secondary";
  return "outline";
}

export function AdminUsersPage() {
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);

  const { data: users, isLoading } = useQuery<UserSummary[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get<UserSummary[]>("/admin/users"),
  });

  const { data: domains } = useQuery<Domain[]>({
    queryKey: ["admin-domains"],
    queryFn: () => api.get<Domain[]>("/admin/domains"),
  });

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Users</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users ?? []).map((u) => (
              <TableRow
                key={u.id}
                className={selectedUser?.id === u.id ? "bg-amber-50" : "hover:bg-gray-50"}
              >
                <TableCell>
                  <p className="font-medium text-gray-900">{u.display_name ?? u.email}</p>
                  {u.display_name && (
                    <p className="text-xs text-gray-400">{u.email}</p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r} variant={roleBadgeVariant(r)} className="text-xs">
                        {r}
                      </Badge>
                    ))}
                    {u.roles.length === 0 && (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {u.is_active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-400">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                  >
                    {selectedUser?.id === u.id ? "Close" : "Domains"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(users ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-gray-400">
                  No users yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <DomainAssignmentPanel
          user={selectedUser}
          domains={(domains ?? []).filter((d) => !d.disabled_at)}
        />
      )}
    </div>
  );
}

function DomainAssignmentPanel({
  user,
  domains,
}: {
  user: UserSummary;
  domains: Domain[];
}) {
  const queryClient = useQueryClient();
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [saveMsg, setSaveMsg] = useState("");

  const { data: userDomains } = useQuery<{ domain: string }[]>({
    queryKey: ["user-domains", user.id],
    queryFn: () => api.get<{ domain: string }[]>(`/admin/users/${user.id}/domains`),
  });

  const saveMutation = useMutation({
    mutationFn: (domains: string[]) =>
      api.put(`/admin/users/${user.id}/domains`, { domains }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-domains", user.id] });
      setSaveMsg("Saved.");
      setTimeout(() => setSaveMsg(""), 2000);
    },
  });

  useEffect(() => {
    if (userDomains) setSelectedDomains(userDomains.map((ud) => ud.domain));
  }, [userDomains]);

  function toggleDomain(name: string) {
    setSelectedDomains((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    );
  }

  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-gray-700">
        Domain assignments — {user.display_name ?? user.email}
      </p>
      {domains.length === 0 ? (
        <p className="text-sm text-gray-400">No active domains. Create one on the Domains tab.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {domains.map((d) => (
              <label key={d.name} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedDomains.includes(d.name)}
                  onChange={() => toggleDomain(d.name)}
                />
                {d.name}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => saveMutation.mutate(selectedDomains)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : "Save assignments"}
            </Button>
            {saveMsg && <span className="text-sm text-green-600">{saveMsg}</span>}
          </div>
        </>
      )}
    </div>
  );
}
