import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useAuth, ROLE_LABEL, ROLE_COLOR } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { ChartColumnBig, LayoutDashboard, Settings, ScrollText, Tractor, FileSpreadsheet, UserStar, Users, ClipboardCheck, Smartphone } from "lucide-react";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const { name, role, dealerName, profilePic, userId, logout } = useAuth();

  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      className={`flex flex-col justify-between bg-white py-4 text-[#1E1951] rounded-2xl max-h-[calc(100vh-40px)] sticky top-5 overflow-hidden transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Header: logo + toggle */}
      <div
        className={`flex flex-col items-start px-3 mb-2 gap-4 ${collapsed ? "justify-center" : "justify-between"}`}
      >
        <Logo size="lg" showWordmark={!collapsed} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 w-full flex items-center gap-3 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
            />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto ">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-500 hover:bg-gray-50 hover:text-[#1E1951]"
            }`
          }
        >
          <LayoutDashboard />
          {!collapsed && <span className="truncate">Dashboard</span>}
        </NavLink>

        {(role === "admin" || role === "rsm") && (
          <NavLink
            to="/audit-log"
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#1E1951]"
              }`
            }
          >
            <ScrollText />
            {!collapsed && <span className="truncate">Audit Log</span>}
          </NavLink>
        )}

        {role === "admin" && (
          <NavLink
            to="/setup"
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#1E1951]"
              }`
            }
          >
            <Settings />
            {!collapsed && <span className="truncate">Master Setup</span>}
          </NavLink>
        )}

        {(role === "admin" || role === "rsm" || role === "area_manager" || role === "service_engineer" || role === "service_technician" || role === "dealer") && (
          <NavLink
            to="/tractor"
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#1E1951]"
              }`
            }
          >
            <Tractor />
            {!collapsed && <span className="truncate">Tractor</span>}
          </NavLink>
        )}

        {(role === "admin" || role === "rsm" || role === "area_manager" || role === "service_engineer" || role === "service_technician" || role === "dealer") && (
          <NavLink
            to="/sap-tractor"
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#1E1951]"
              }`
            }
          >
            <FileSpreadsheet />
            {!collapsed && <span className="truncate">SAP Tractor</span>}
          </NavLink>
        )}

        {role === "admin" && (
          <NavLink
            to="/customers"
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#1E1951]"
              }`
            }
          >
            <UserStar />
            {!collapsed && <span className="truncate">Customers</span>}
          </NavLink>
        )}

        {(role === "admin" || role === "rsm" || role === "area_manager" || role === "service_engineer" || role === "service_technician" || role === "dealer" || role === "mechanic") && (
          <NavLink
            to="/pdi"
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#1E1951]"
              }`
            }
          >
            <ClipboardCheck />
            {!collapsed && <span className="truncate">PDI</span>}
          </NavLink>
        )}

        {(role === "area_manager" || role === "service_engineer" || role === "service_technician" || role === "dealer" || role === "mechanic") && (
          <NavLink
            to="/mobile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#1E1951]"
              }`
            }
          >
            <Smartphone />
            {!collapsed && <span className="truncate">Mobile View</span>}
          </NavLink>
        )}

        {(role === "admin" || role === "dealer" || role === "rsm" || role === "area_manager" || role === "service_engineer" || role === "service_technician") && (
          <NavLink
            to="/users"
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#1E1951]"
              }`
            }
          >
            <Users />
            {!collapsed && (
              <span className="truncate">
                {role === "dealer" ? "My Team" : "Users"}
              </span>
            )}
          </NavLink>
        )}

        {(role === "admin" || role === "rsm" || role === "area_manager" || role === "service_engineer" || role === "service_technician" || role === "dealer") && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#1E1951]"
              }`
            }
          >
                  <ChartColumnBig />
            {!collapsed && <span className="truncate">Analytics</span>}
          </NavLink>
        )}
      </nav>

      {/* Footer: user + logout */}
      <div className="px-3 pt-3 border-t border-gray-100 mt-2 flex flex-col gap-1">
        <div className="flex items-center gap-3  py-2">
          <Avatar
            name={name ?? '?'}
            role={role ?? undefined}
            dealerName={dealerName ?? undefined}
            photo={profilePic ?? undefined}
            userId={userId ?? undefined}
            size="xl"
            popoverPos="top"
            showPopover={collapsed}
            className="outline outline-1 outline-[#1E1951]/30"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-700">
                {name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {role && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${ROLE_COLOR[role] ?? "bg-gray-100 text-gray-500"}`}
                  >
                    {ROLE_LABEL[role] ?? role}
                  </span>
                )}
                {dealerName && (
                  <span className="text-[10px] text-gray-400 truncate">
                    {dealerName}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          aria-label="Sign out"
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
            />
          </svg>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
