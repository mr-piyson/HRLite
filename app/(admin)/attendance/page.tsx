"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMinutes } from "@/server/services/attendance-calculator";
import { AttendanceStatusLabel } from "@/server/domain/attendance";
import { AttendanceEditDialog } from "@/components/attendance/attendance-edit-dialog";
import { AttendanceManualDialog } from "@/components/attendance/attendance-manual-dialog";
import { todayKey } from "@/lib/utils";
import Link from "next/link";
import { ListOrdered, MoreHorizontal, Pencil, Trash2 } from "lucide-react";



const statusColors: Record<string, string> = {
  Present: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Late: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  HalfDay: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Incomplete: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
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

export default function AttendancePage() {
  const [date, setDate] = useState(todayKey());
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

  const presentCount = data?.filter((a) => a.status === "Present" || a.status === "Late").length ?? 0;
  const totalCount = data?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Daily Attendance</h1>
          <p className="text-sm text-muted-foreground">View and manage attendance records by date</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-48">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <AttendanceManualDialog date={date} />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/attendance/logs" />}
          >
            <ListOrdered className="mr-1 size-4" />
            View Logs
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Present Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Absent Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{totalCount - presentCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Time In</TableHead>
              <TableHead>Time Out</TableHead>
              <TableHead className="text-right">Working Hrs</TableHead>
              <TableHead className="text-right">Overtime</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.map((a) => (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer"
                    onClick={() =>
                      setEditingRecord({
                        id: a.id,
                        employee: { fullName: a.employee.fullName, empCode: a.employee.empCode },
                        date: a.date,
                        timeIn: a.timeIn,
                        timeOut: a.timeOut,
                        workingMinutes: a.workingMinutes,
                        status: a.status,
                        breakMinutes: a.breakMinutes,
                      })
                    }
                  >
                    <TableCell className="font-medium">{a.employee.fullName}</TableCell>
                    <TableCell className="font-mono text-xs">{a.employee.empCode}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.supplier?.supplierName ?? "Direct"}
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
                            onClick={(e) => {
                              e.stopPropagation();
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
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
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
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  No attendance records for {date}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
