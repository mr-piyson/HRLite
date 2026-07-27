"use client"

import { useMemo } from "react"
import { trpc } from "@/lib/trpc/client"
import { StatsCard } from "@/components/dashboard/stats-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { SupplierBreakdown } from "@/components/dashboard/supplier-breakdown"
import {
  Clock,
  UserX,
  AlertTriangle,
  Timer,
  LogIn,
  LogOut,
} from "lucide-react"

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function DashboardPage() {
  const dateKey = useMemo(() => todayKey(), [])
  const { data, isLoading } = trpc.dashboard.today.useQuery(
    { date: dateKey },
    { refetchOnMount: false, staleTime: 30_000 },
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Attendance overview for {data?.date ?? dateKey}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard
          title="Checked In"
          value={data?.checkedIn ?? "-"}
          icon={LogIn}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatsCard
          title="Currently Working"
          value={data?.currentlyWorking ?? "-"}
          icon={Clock}
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatsCard
          title="Checked Out"
          value={data?.checkedOut ?? "-"}
          icon={LogOut}
          iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
        />
        <StatsCard
          title="Absent Today"
          value={data?.absentToday ?? "-"}
          icon={UserX}
          iconClassName="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        />
        <StatsCard
          title="Late Today"
          value={data?.lateToday ?? "-"}
          icon={AlertTriangle}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <StatsCard
          title="Avg Working Hrs"
          value={
            data?.averageWorkingMinutes
              ? `${Math.round(data.averageWorkingMinutes / 60)}h ${data.averageWorkingMinutes % 60}m`
              : "-"
          }
          icon={Timer}
          iconClassName="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SupplierBreakdown
          data={data?.supplierBreakdown}
          isLoading={isLoading}
        />
        <RecentActivity
          items={data?.recent}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
