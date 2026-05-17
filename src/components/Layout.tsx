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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/auth";

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
