import { useState, useCallback } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Bell, Menu, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/auth";
import { api } from "@/lib/api";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  section: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { section: "Records",   to: "/tasks",      icon: "✓",  label: "Tasks" },
  { section: "Records",   to: "/workflows",  icon: "▦",  label: "Workflows" },
  { section: "Records",   to: "/principles", icon: "◐",  label: "Principles" },
  { section: "Records",   to: "/review",     icon: "⧉",  label: "Review queue" },
  { section: "Ingestion", to: "/ingestion",  icon: "⇪",  label: "Ingestion" },
  { section: "Admin",     to: "/admin",      icon: "◉",  label: "Admin", adminOnly: true },
];

const SECTIONS = ["Records", "Ingestion", "Admin"];

function NavItemLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        `bp-navlink${isActive ? " bp-navlink--active" : ""}`
      }
      onClick={onClick}
    >
      <span className="bp-navicon">{item.icon}</span>
      <span className="bp-navtext">{item.label}</span>
    </NavLink>
  );
}

function NotificationBell({ displayName, onClick }: { displayName: string; onClick?: () => void }) {
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
        `bp-navlink${isActive ? " bp-navlink--active" : ""}`
      }
      onClick={onClick}
    >
      <span className="bp-navicon" style={{ position: "relative", display: "inline-block" }}>
        <Bell size={13} />
        {count > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -6,
            background: "var(--bp-accent)", color: "#000",
            fontSize: 9, fontWeight: 800, borderRadius: 999,
            width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </span>
      <span className="bp-navtext">{displayName}</span>
    </NavLink>
  );
}

export function Layout() {
  const { user } = useAuth();
  const roles: string[] = (user?.profile["groups"] as string[]) ?? [];
  const isAdmin = roles.includes("admin");
  const displayName = user?.profile.name ?? user?.profile.email ?? "User";
  const role = roles[0] ?? "contributor";

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const [railOpen, setRailOpen] = useState(false);
  const closeRail = useCallback(() => setRailOpen(false), []);

  return (
    <div className="bp-app">
      {/* Mobile top bar */}
      <header className="bp-mobile-header">
        <button
          className="bp-hamburger"
          onClick={() => setRailOpen((o) => !o)}
          aria-label={railOpen ? "Close menu" : "Open menu"}
          aria-expanded={railOpen}
        >
          {railOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="bp-mobile-header__logo">
          blue<span>printed</span>.io
        </span>
      </header>

      {/* Overlay backdrop (mobile only) */}
      <div
        className={`bp-rail-overlay${railOpen ? " bp-rail-overlay--open" : ""}`}
        onClick={closeRail}
        aria-hidden="true"
      />

      <div className="bp-layout">
        {/* Sidebar rail */}
        <aside className={`bp-rail${railOpen ? " bp-rail--open" : ""}`}>
          <div className="bp-rail__head">
            <NavLink to="/" style={{ textDecoration: "none" }} onClick={closeRail}>
              <span className="bp-rail__logo-text">
                blue<span>printed</span>.io
              </span>
            </NavLink>
          </div>

          {/* Profile block */}
          <section className="bp-rail__profile">
            <div className="bp-rail__avatar" aria-hidden="true">
              {displayName[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="bp-rail__profile-text">
              <span className="bp-rail__profile-label">Signed in</span>
              <span className="bp-rail__profile-user">{displayName}</span>
              <span className="bp-rail__profile-role">{role}</span>
            </div>
            <button className="bp-rail__logout" onClick={() => void signOut()} title="Sign out" aria-label="Sign out">
              ⎋
            </button>
          </section>

          {/* Dashboard link */}
          <nav className="bp-rail__nav">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `bp-navlink${isActive ? " bp-navlink--active" : ""}`
              }
              onClick={closeRail}
            >
              <span className="bp-navicon">⌂</span>
              <span className="bp-navtext">Dashboard</span>
            </NavLink>

            {SECTIONS.map((section) => {
              const items = visibleItems.filter((i) => i.section === section);
              if (!items.length) return null;
              return (
                <div className="bp-rail__section" key={section}>
                  <div className="bp-rail__section-title">{section}</div>
                  {items.map((item) => (
                    <NavItemLink key={item.to} item={item} onClick={closeRail} />
                  ))}
                </div>
              );
            })}

            {/* Notifications at the bottom of nav */}
            <div className="bp-rail__section">
              <div className="bp-rail__section-title">Activity</div>
              <NotificationBell displayName="Notifications" onClick={closeRail} />
            </div>
          </nav>

          <div className="bp-rail__foot">
            <span className="bp-muted">blueprinted.io · AGPL-3.0</span>
          </div>
        </aside>

        {/* Main content */}
        <main className="bp-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
