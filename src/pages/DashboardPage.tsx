import { useAuth } from "@/context/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  const roles: string[] = (user?.profile["blueprinted_roles"] as string[]) ?? [];
  const name = user?.profile.name ?? user?.profile.email ?? "there";

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome back, {name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {roles.includes("admin") ? "Admin" : "Contributor"} dashboard
      </p>

      {/* Placeholder — analytics and widgets added in next session (§23.2) */}
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-sm text-gray-400">
          Dashboard content coming in Sprint 8 continuation.
        </p>
      </div>
    </div>
  );
}
