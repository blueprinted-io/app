import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface MeResponse {
  id: string;
  sub: string;
  email: string;
  display_name: string | null;
  roles: string[];
  created_at: string;
}

export function ProfilePage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/users/me"),
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      <p className="mt-1 text-sm text-gray-500">Your account details.</p>

      <div className="mt-8 max-w-lg space-y-6">
        {/* OIDC identity */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Identity
          </h2>
          <dl className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            <Row label="Name" value={user?.profile.name} />
            <Row label="Email" value={user?.profile.email} />
          </dl>
        </section>

        {/* Platform account */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Platform account
          </h2>
          {isLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
              Loading…
            </div>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-600">
              Failed to load profile from API.
            </p>
          )}
          {data && (
            <dl className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              <Row label="Display name" value={data.display_name ?? "—"} />
              <Row label="Roles" value={data.roles.join(", ") || "none"} />
              <Row label="Member since" value={formatDate(data.created_at)} />
            </dl>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex justify-between px-4 py-3">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value ?? "—"}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
