"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardCheck,
  BarChart3,
  Settings,
  FolderKanban,
} from "lucide-react"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Employees", href: "/employees", icon: Users },
  { label: "Suppliers", href: "/suppliers", icon: Building2 },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Attendance", href: "/attendance", icon: ClipboardCheck },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings, adminOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { data: settings } = trpc.general.get.useQuery()
  const appName = settings?.appName ?? "Attendance Kiosk"
  const isAdmin = session?.user.role === "admin"
  const items = navItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          {settings?.appLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.appLogo} alt="" className="size-full object-contain" />
          ) : (
            appName.slice(0, 2).toUpperCase()
          )}
        </div>
        <span className="truncate font-semibold text-sm">{appName}</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground">
          <div className="size-2 rounded-full bg-emerald-500" />
          v1.0.0 — Enterprise HRMS
        </div>
      </div>
    </aside>
  )
}
