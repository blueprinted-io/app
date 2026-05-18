import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin/settings", label: "Settings" },
  { to: "/admin/domains", label: "Domains" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/health", label: "Health" },
];

export function AdminLayout() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-6">
        <nav className="flex gap-6">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "border-b-2 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-brand-amber text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700",
                ].join(" ")
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}
