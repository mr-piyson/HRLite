"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import { useQueryState } from "nuqs";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMinutes } from "@/server/services/attendance-calculator";
import { AttendanceStatusLabel, ApprovalStatusLabel } from "@/server/domain/attendance";
import { AttendanceEditDialog } from "@/components/attendance/attendance-edit-dialog";
import { AttendanceManualDialog } from "@/components/attendance/attendance-manual-dialog";
import { AttendanceApproveDialog } from "@/components/attendance/attendance-approve-dialog";
import { todayKey } from "@/lib/utils";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronDown, ListOrdered, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import type { CalendarDay } from "@/server/services/attendance-calendar.service";

const statusColors: Record<string, string> = {
  Present: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Late: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  HalfDay: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Incomplete: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const approvalColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const adminCellClass = "tabular-nums bg-amber-50/70 dark:bg-amber-950/30";

function AdminTooltip({
  reason,
  updatedAt,
  children,
}: {
  reason: string | null;
  updatedAt: Date | string;
  children: React.ReactNode;
}) {
  if (!reason) return <>{children}</>;
  const time = new Date(updatedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="cursor-help">{children}</span>}></TooltipTrigger>
        <TooltipContent side="top" align="center">
          <p className="text-xs">{reason}</p>
          <p className="text-[10px] text-background/70">{time}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function AttendancePageInner() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [date, setDate] = useQueryState("date", { defaultValue: todayKey(), clearOnDefault: true });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{
    id: string;
    employee: { fullName: string; empCode: string };
    date: string;
    timeIn: Date | null;
    timeOut: Date | null;
    workingMinutes: number;
    status: string;
    breakMinutes: number;
  } | null>(null);
  const { data, isLoading } = trpc.attendance.byDate.useQuery({ date });
  const { data: settings } = trpc.general.get.useQuery();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const { data: monthData } = trpc.attendance.calendarByMonth.useQuery(
    { year: calendarMonth.getFullYear(), month: calendarMonth.getMonth() + 1 },
    { enabled: calendarOpen },
  );
  const recordsByDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    if (!monthData) return map;
    for (const day of monthData) map.set(day.date, day);
    return map;
  }, [monthData]);

  const totalCount = data?.length ?? 0;
  const presentCount = data?.filter((a) => a.status === "Present" || a.status === "Late").length ?? 0;
  const pendingCount = data?.filter((a) => a.approvalStatus === "pending").length ?? 0;
  const approvedCount = data?.filter((a) => a.approvalStatus === "approved").length ?? 0;

  const pendingRecords = data?.filter((a) => a.approvalStatus === "pending") ?? [];
  const selectedPendingIds = [...selectedIds].filter((id) => pendingRecords.some((r) => r.id === id));

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(pendingRecords.map((r) => r.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [pendingRecords],
  );

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const colSpan = isAdmin ? 11 : 9;
  const [yearStr, monthStr, dayStr] = date.split("-");
  const parsedDate = new Date(+yearStr, +monthStr - 1, +dayStr);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-end gap-2">
          <AttendanceManualDialog date={date} />
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button variant="outline" size="sm">
                  <CalendarDays className="mr-1 size-4" />
                  {format(parsedDate, "MMM d, yyyy")}
                  <ChevronDown className="ml-1 size-3 text-muted-foreground" />
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parsedDate}
                onSelect={(day) => {
                  if (day) {
                    setDate(format(day, "yyyy-MM-dd"));
                    setCalendarOpen(false);
                  }
                }}
                onMonthChange={(d) => setCalendarMonth(d)}
                components={{
                  DayButton: (props) => {
                    const dateKey = format(props.day.date, "yyyy-MM-dd");
                    const dayData = recordsByDate.get(dateKey);
                    return (
                      <div className="relative">
                        <CalendarDayButton {...props} />
                        {dayData && (dayData.approvedCount > 0 || dayData.pendingCount > 0) && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {dayData.approvedCount > 0 && (
                              <span className="size-1 rounded-full bg-emerald-500" />
                            )}
                            {dayData.pendingCount > 0 && (
                              <span className="size-1 rounded-full bg-orange-500" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  },
                }}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/attendance/logs" />}>
            <ListOrdered className="mr-1 size-4" />
            View Logs
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/attendance/calendar" />}>
            <CalendarDays className="mr-1 size-4" />
            Calendar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-5">
        {[
          { label: "Total Employees", value: totalCount },
          { label: "Present", value: presentCount, className: "text-emerald-600" },
          { label: "Absent", value: totalCount - presentCount, className: "text-red-600" },
          { label: "Pending", value: pendingCount, className: "text-amber-600" },
          { label: "Approved", value: approvedCount, className: "text-emerald-600" },
        ].map((item) => (
          <div key={item.label} className="rounded-md border px-3 py-2">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`text-lg font-bold tabular-nums ${item.className ?? ""}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Admin Controls — batch approve */}
      {isAdmin && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <Checkbox
            checked={selectedIds.size > 0 && selectedIds.size === pendingRecords.length}
            onCheckedChange={(checked) => handleSelectAll(checked === true)}
            disabled={pendingRecords.length === 0}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size === 0
              ? `${pendingRecords.length} pending record${pendingRecords.length === 1 ? "" : "s"}`
              : `${selectedIds.size} of ${pendingRecords.length} selected`}
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setShowApproveDialog(true)}
            >
              <CheckCircle2 className="mr-1 size-4" />
              Approve Selected ({selectedIds.size})
            </Button>
            <Button size="sm" disabled={pendingRecords.length === 0} onClick={() => setShowApproveDialog(true)}>
              <CheckCircle2 className="mr-1 size-4" />
              Approve All Pending
            </Button>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead className="w-10"></TableHead>}
              <TableHead>Employee</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Time In</TableHead>
              <TableHead>Time Out</TableHead>
              <TableHead className="text-right">Working Hrs</TableHead>
              <TableHead className="text-right">Overtime</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approval</TableHead>
              {isAdmin && <TableHead className="w-[60px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: colSpan }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.map((a) => {
                  const isApproved = a.approvalStatus === "approved";
                  return (
                    <TableRow
                      key={a.id}
                      className={isAdmin && !isApproved ? "cursor-pointer" : ""}
                      onClick={() => {
                        if (!isAdmin || isApproved) return;
                        setEditingRecord({
                          id: a.id,
                          employee: { fullName: a.employee.fullName, empCode: a.employee.empCode },
                          date: a.date,
                          timeIn: a.timeIn,
                          timeOut: a.timeOut,
                          workingMinutes: a.workingMinutes,
                          status: a.status,
                          breakMinutes: a.breakMinutes,
                        });
                      }}
                    >
                      {isAdmin && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(a.id)}
                            onCheckedChange={(checked) => handleSelectOne(a.id, checked === true)}
                            disabled={isApproved}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{a.employee.fullName}</TableCell>
                      <TableCell className="font-mono text-xs">{a.employee.empCode}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.supplier?.supplierName ?? settings?.companyName ?? "Direct"}
                      </TableCell>
                      <TableCell className={a.adminEditReason ? adminCellClass : "tabular-nums"}>
                        <AdminTooltip reason={a.adminEditReason} updatedAt={a.updatedAt}>
                          {a.timeIn
                            ? new Date(a.timeIn).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </AdminTooltip>
                      </TableCell>
                      <TableCell className={a.adminEditReason ? adminCellClass : "tabular-nums"}>
                        <AdminTooltip reason={a.adminEditReason} updatedAt={a.updatedAt}>
                          {a.timeOut
                            ? new Date(a.timeOut).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </AdminTooltip>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatMinutes(a.workingMinutes)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {a.overtimeMinutes > 0 ? formatMinutes(a.overtimeMinutes) : "—"}
                      </TableCell>
                      <TableCell className={a.adminEditReason ? "bg-amber-50/70 dark:bg-amber-950/30" : ""}>
                        <AdminTooltip reason={a.adminEditReason} updatedAt={a.updatedAt}>
                          <Badge className={statusColors[a.status] ?? ""} variant="outline">
                            {AttendanceStatusLabel[a.status as keyof typeof AttendanceStatusLabel] ?? a.status}
                          </Badge>
                        </AdminTooltip>
                      </TableCell>
                      <TableCell>
                        <Badge className={approvalColors[a.approvalStatus] ?? ""} variant="outline">
                          {isApproved && <CheckCircle2 className="mr-1 inline size-3" />}
                          {ApprovalStatusLabel[a.approvalStatus as keyof typeof ApprovalStatusLabel] ??
                            a.approvalStatus}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              }
                              onClick={(e) => e.stopPropagation()}
                            ></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={isApproved}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isApproved) return;
                                  setEditingRecord({
                                    id: a.id,
                                    employee: { fullName: a.employee.fullName, empCode: a.employee.empCode },
                                    date: a.date,
                                    timeIn: a.timeIn,
                                    timeOut: a.timeOut,
                                    workingMinutes: a.workingMinutes,
                                    status: a.status,
                                    breakMinutes: a.breakMinutes,
                                  });
                                }}
                              >
                                <Pencil className="mr-2 size-4" />
                                {isApproved ? "Approved — locked" : "Edit"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                disabled={isApproved}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isApproved) return;
                                  setEditingRecord({
                                    id: a.id,
                                    employee: { fullName: a.employee.fullName, empCode: a.employee.empCode },
                                    date: a.date,
                                    timeIn: a.timeIn,
                                    timeOut: a.timeOut,
                                    workingMinutes: a.workingMinutes,
                                    status: a.status,
                                    breakMinutes: a.breakMinutes,
                                  });
                                }}
                              >
                                <Trash2 className="mr-2 size-4" />
                                {isApproved ? "Approved — locked" : "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
            {!isLoading && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
                  No attendance records for {date}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Approve Dialog */}
      <AttendanceApproveDialog
        date={date}
        count={selectedIds.size > 0 ? selectedPendingIds.length : pendingRecords.length}
        allPending={selectedIds.size === 0}
        employeeIds={
          selectedIds.size > 0
            ? [...selectedPendingIds]
                .map((id) => {
                  const r = data?.find((a) => a.id === id);
                  return r?.employeeId ?? "";
                })
                .filter(Boolean)
            : undefined
        }
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        onSuccess={() => setSelectedIds(new Set())}
      />

      {/* Edit Dialog */}
      {editingRecord && (
        <AttendanceEditDialog
          record={editingRecord}
          open={!!editingRecord}
          onOpenChange={(open) => {
            if (!open) setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={null}>
      <AttendancePageInner />
    </Suspense>
  );
}
