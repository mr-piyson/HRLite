"use client";

import { trpc } from "@/lib/trpc/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceStatusLabel, ApprovalStatusLabel } from "@/server/domain/attendance";
import { formatMinutes } from "@/server/services/attendance-calculator";
import { CheckCircle2 } from "lucide-react";

const statusColors: Record<string, string> = {
  Present: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Late: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  HalfDay: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Incomplete: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

interface AttendanceCalendarDrawerProps {
  date: string | null
  dayName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AttendanceCalendarDrawer({
  date,
  dayName,
  open,
  onOpenChange,
}: AttendanceCalendarDrawerProps) {
  const { data, isLoading } = trpc.attendance.byDate.useQuery(
    { date: date ?? "" },
    { enabled: !!date && open },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dayName ?? "Select a day"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No attendance records for this day
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
              <span>Employee</span>
              <span>Time</span>
              <span className="text-right">Hours</span>
              <span>Status</span>
              <span>Approval</span>
            </div>
            {data.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-5 gap-2 items-center rounded-md px-2 py-2 hover:bg-muted/50 text-sm"
              >
                <span className="font-medium truncate">{r.employee.fullName}</span>
                <span className="tabular-nums text-xs text-muted-foreground">
                  {r.timeIn
                    ? new Date(r.timeIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                  {" → "}
                  {r.timeOut
                    ? new Date(r.timeOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </span>
                <span className="tabular-nums text-right">{formatMinutes(r.workingMinutes)}</span>
                <Badge className={statusColors[r.status] ?? ""} variant="outline">
                  {AttendanceStatusLabel[r.status as keyof typeof AttendanceStatusLabel] ?? r.status}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {r.approvalStatus === "approved" && (
                    <CheckCircle2 className="size-3 text-emerald-500" />
                  )}
                  {ApprovalStatusLabel[r.approvalStatus as keyof typeof ApprovalStatusLabel] ?? r.approvalStatus}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
