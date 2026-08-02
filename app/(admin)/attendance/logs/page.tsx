"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogCreateDialog } from "@/components/attendance/log-create-dialog";
import { LogEditDialog } from "@/components/attendance/log-edit-dialog";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const logTypeColors: Record<string, string> = {
  IN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  OUT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  BREAK_IN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  BREAK_OUT: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function AttendanceLogsPage() {
  const isAdmin = useIsAdmin();
  const { data, isLoading } = trpc.attendanceLog.list.useQuery({ take: 100 });
  const [editingLog, setEditingLog] = useState<{
    id: string;
    employeeId: string;
    logTime: Date;
    logType: string;
    deviceName: string | null;
    ipAddress: string | null;
    notes: string | null;
    employee: {
      fullName: string;
      empCode: string;
    };
  } | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance Logs</h1>
          <p className="text-sm text-muted-foreground">Immutable audit trail of all kiosk actions</p>
        </div>
        {isAdmin && <LogCreateDialog />}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Kiosk</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-15"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="tabular-nums text-xs whitespace-nowrap">
                      {new Date(log.logTime).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{log.employee.fullName}</TableCell>
                    <TableCell className="font-mono text-xs">{log.employee.empCode}</TableCell>
                    <TableCell>
                      <Badge className={logTypeColors[log.logType] ?? ""} variant="outline">
                        {log.logType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.deviceName ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddress ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.kioskId ?? "—"}</TableCell>
                    <TableCell className="max-w-50 truncate text-xs text-muted-foreground">
                      {log.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          ></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                setEditingLog({
                                  id: log.id,
                                  employeeId: log.employeeId,
                                  logTime: log.logTime,
                                  logType: log.logType,
                                  deviceName: log.deviceName,
                                  ipAddress: log.ipAddress,
                                  notes: log.notes,
                                  employee: log.employee,
                                })
                              }
                            >
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setEditingLog({
                                  id: log.id,
                                  employeeId: log.employeeId,
                                  logTime: log.logTime,
                                  logType: log.logType,
                                  deviceName: log.deviceName,
                                  ipAddress: log.ipAddress,
                                  notes: log.notes,
                                  employee: log.employee,
                                })
                              }
                            >
                              <Trash2 className="mr-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  No attendance logs recorded yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editingLog && (
        <LogEditDialog
          log={editingLog}
          open={!!editingLog}
          onOpenChange={(open) => {
            if (!open) setEditingLog(null);
          }}
        />
      )}
    </div>
  );
}
