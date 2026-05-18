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

interface Domain {
  name: string;
  created_at: string;
  created_by: string;
  disabled_at: string | null;
}

interface User {
  id: string;
  email: string;
  display_name: string | null;
  roles: string[];
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

      <UserDomainSection domains={domains ?? []} />
    </div>
  );
}

function UserDomainSection({ domains }: { domains: Domain[] }) {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [saveMsg, setSaveMsg] = useState("");

  const { data: users } = useQuery<User[]>({
    queryKey: ["users-list"],
    queryFn: () => api.get<User[]>("/users"),
  });

  const { data: userDomains } = useQuery<{ domain: string }[]>({
    queryKey: ["user-domains", selectedUser?.id],
    queryFn: () => api.get<{ domain: string }[]>(`/admin/users/${selectedUser!.id}/domains`),
    enabled: !!selectedUser,
  });

  const saveMutation = useMutation({
    mutationFn: (domains: string[]) =>
      api.put(`/admin/users/${selectedUser!.id}/domains`, { domains }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-domains", selectedUser?.id] });
      setSaveMsg("Saved.");
      setTimeout(() => setSaveMsg(""), 2000);
    },
  });

  const activeDomains = domains.filter((d) => !d.disabled_at);
  const filteredUsers = (users ?? []).filter(
    (u) =>
      u.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
      (u.display_name ?? "").toLowerCase().includes(searchEmail.toLowerCase())
  );

  useEffect(() => {
    if (userDomains) {
      setSelectedDomains(userDomains.map((ud) => ud.domain));
    }
  }, [userDomains]);

  function handleSelectUser(u: User) {
    setSelectedUser(u);
    setSelectedDomains([]);
    setSaveMsg("");
  }

  function toggleDomain(name: string) {
    setSelectedDomains((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">User domain assignments</h3>
      <div className="mb-3">
        <input
          type="text"
          className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber"
          placeholder="Search users by email or name…"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
        />
        {searchEmail && (
          <ul className="mt-1 max-h-40 overflow-auto rounded border border-gray-200 bg-white shadow">
            {filteredUsers.slice(0, 10).map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    handleSelectUser(u);
                    setSearchEmail("");
                  }}
                >
                  {u.display_name ?? u.email}
                  <span className="ml-1 text-xs text-gray-400">{u.email}</span>
                </button>
              </li>
            ))}
            {filteredUsers.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">No users found.</li>
            )}
          </ul>
        )}
      </div>

      {selectedUser && (
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-gray-700">
            {selectedUser.display_name ?? selectedUser.email}
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {activeDomains.map((d) => (
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
        </div>
      )}
    </div>
  );
}
