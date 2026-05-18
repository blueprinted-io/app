import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  GitBranch,
  Lightbulb,
  ClipboardList,
  Upload,
  Search,
  Settings,
  LogOut,
  User,
  Bell,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/auth";
import { api } from "@/lib/api";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/workflows", label: "Workflows", icon: GitBranch },
  { to: "/principles", label: "Principles", icon: Lightbulb },
  { to: "/review", label: "Review Queue", icon: ClipboardList },
  { to: "/ingestion", label: "Ingestion", icon: Upload },
  { to: "/search", label: "Search", icon: Search },
  { to: "/admin", label: "Admin", icon: Settings, adminOnly: true },
];

function NavItemLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-brand-amber text-brand-black"
            : "text-gray-400 hover:bg-white/10 hover:text-white"
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </NavLink>
  );
}

function NotificationBell() {
  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => api.get<{ id: string; read_at: string | null }[]>("/notifications?unread_only=true&limit=99"),
    refetchInterval: 30_000,
  });

  const count = data?.length ?? 0;

  return (
    <NavLink
      to="/notifications"
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-brand-amber text-brand-black"
            : "text-gray-400 hover:bg-white/10 hover:text-white"
        )
      }
    >
      <span className="relative">
        <Bell className="h-4 w-4 shrink-0" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-amber text-[10px] font-bold text-brand-black">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </span>
      Notifications
    </NavLink>
  );
}

export function Layout() {
  const { user } = useAuth();
  const roles: string[] = (user?.profile["groups"] as string[]) ?? [];
  const isAdmin = roles.includes("admin");
  const displayName = user?.profile.name ?? user?.profile.email ?? "User";

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-brand-black">
        {/* Logo */}
        <div className="flex h-14 items-center px-4">
          <span className="text-lg font-bold text-white tracking-tight">
            blue<span className="text-brand-amber">printed</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {visibleItems.map((item) => (
            <NavItemLink key={item.to} item={item} />
          ))}
          <NotificationBell />
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-2">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-amber text-brand-black"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              )
            }
          >
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayName}</span>
          </NavLink>
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
