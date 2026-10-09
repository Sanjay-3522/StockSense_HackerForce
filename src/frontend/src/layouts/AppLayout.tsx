import type React from "react"
import { useEffect, useRef, useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useApi } from "../hooks/useApi"
import { listActions } from "../api/intelligence"
import {
  GridIcon,
  BoxIcon,
  WarehouseIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  SwitchIcon,
  ScaleIcon,
  HistoryIcon,
  SparklesIcon,
  SettingsIcon,
  UserIcon,
  LogoutIcon,
  ChevronDownIcon,
  BellIcon,
  ClipboardIcon,
} from "../components/ui/icons"

interface NavItem {
  to: string
  label: string
  icon: (props: { className?: string }) => React.JSX.Element
  badge?: number
}

interface NavSection {
  label: string
  items: NavItem[]
}

function useNavSections(openActionsCount: number): NavSection[] {
  return [
    {
      label: "Overview",
      items: [{ to: "/dashboard", label: "Dashboard", icon: GridIcon }],
    },
    {
      label: "Inventory",
      items: [
        { to: "/products", label: "Products", icon: BoxIcon },
        { to: "/stock", label: "Stock Overview", icon: ScaleIcon },
        { to: "/warehouses", label: "Warehouses", icon: WarehouseIcon },
      ],
    },
    {
      label: "Operations",
      items: [
        { to: "/receipts", label: "Receipts", icon: ArrowDownTrayIcon },
        { to: "/deliveries", label: "Deliveries", icon: ArrowUpTrayIcon },
        { to: "/transfers", label: "Transfers", icon: SwitchIcon },
        { to: "/adjustments", label: "Adjustments", icon: ScaleIcon },
        { to: "/move-history", label: "Move History", icon: HistoryIcon },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { to: "/intelligence/overview", label: "Inventory Overview", icon: SparklesIcon },
        { to: "/intelligence/explain", label: "Explain Stock Change", icon: SparklesIcon },
        { to: "/intelligence/investigate", label: "Investigator", icon: SparklesIcon },
        { to: "/intelligence/anomalies", label: "Anomalies", icon: SparklesIcon },
        { to: "/intelligence/reorder", label: "Smart Reorder", icon: SparklesIcon },
        {
          to: "/intelligence/actions",
          label: "Action Center",
          icon: ClipboardIcon,
          badge: openActionsCount,
        },
      ],
    },
    {
      label: "Administration",
      items: [{ to: "/settings", label: "Settings", icon: SettingsIcon }],
    },
  ]
}

function Sidebar({ openActionsCount }: { openActionsCount: number }) {
  const sections = useNavSections(openActionsCount)
  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950 lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
          S
        </div>
        <span className="text-sm font-semibold text-slate-100">StockSense</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-600/15 text-brand-400"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {!!item.badge && (
                    <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-xs font-semibold text-red-400">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}

function ProfileMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-800"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
          {user?.name?.slice(0, 1).toUpperCase() ?? "U"}
        </div>
        <span className="hidden text-sm font-medium text-slate-200 sm:inline">{user?.name}</span>
        <ChevronDownIcon className="h-3.5 w-3.5 text-slate-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-slate-800 bg-slate-900 py-1 shadow-lg">
          <button
            onClick={() => {
              setOpen(false)
              navigate("/profile")
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <UserIcon className="h-4 w-4" /> Profile
          </button>
          <button
            onClick={() => {
              setOpen(false)
              navigate("/settings")
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <SettingsIcon className="h-4 w-4" /> Settings
          </button>
          <div className="my-1 border-t border-slate-800" />
          <button
            onClick={() => {
              setOpen(false)
              logout()
              navigate("/login")
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-800"
          >
            <LogoutIcon className="h-4 w-4" /> Log out
          </button>
        </div>
      )}
    </div>
  )
}

export function AppLayout() {
  const { data } = useApi(() => listActions({ status: "OPEN" }, 1, 1), [])
  const openCount = data?.pagination.total ?? 0

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar openActionsCount={openCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur lg:px-6">
          <div className="lg:hidden text-sm font-semibold text-slate-100">StockSense</div>
          <div className="hidden flex-1 lg:block" />
          <div className="flex items-center gap-3">
            <NavLink
              to="/intelligence/actions"
              className="relative rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Action center"
            >
              <BellIcon className="h-5 w-5" />
              {openCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </NavLink>
            <ProfileMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
