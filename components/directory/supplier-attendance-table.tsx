"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinutes } from "@/server/services/attendance-calculator";
import { todayKey } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

interface SupplierAttendanceTableProps {
  supplierId: string | null;
}

export function SupplierAttendanceTable({ supplierId }: SupplierAttendanceTableProps) {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayKey());
  const [queryKey, setQueryKey] = useState({ from, to });

  const { data, isLoading, isFetching } = trpc.report.attendance.useQuery(queryKey, {
    enabled: !!queryKey.from && !!queryKey.to,
  });

  const group = data?.suppliers.find((g) => g.supplierId === supplierId);
  const rows = group?.employees ?? [];

  const totals = rows.reduce(
    (acc, e) => ({
      workingMinutes: acc.workingMinutes + e.workingMinutes,
      overtimeMinutes: acc.overtimeMinutes + e.overtimeMinutes,
      lateMinutes: acc.lateMinutes + e.lateMinutes,
      payroll: acc.payroll + e.payrollAmount,
    }),
    { workingMinutes: 0, overtimeMinutes: 0, lateMinutes: 0, payroll: 0 },
  );

  const handleRefresh = () => {
    if (from && to && from <= to) setQueryKey({ from, to });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-sm font-medium">Attendance</CardTitle>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="att-from" className="text-xs text-muted-foreground">From</Label>
            <Input id="att-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="att-to" className="text-xs text-muted-foreground">To</Label>
            <Input id="att-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36" />
          </div>
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={`mr-1 size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No attendance records in this range.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Working Hrs</TableHead>
                <TableHead className="text-right">Overtime</TableHead>
                <TableHead className="text-right">Late</TableHead>
                <TableHead className="text-right">Payroll</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((emp) => (
                <TableRow key={emp.employeeId}>
                  <TableCell className="font-medium">{emp.fullName}</TableCell>
                  <TableCell className="font-mono text-xs">{emp.empCode}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMinutes(emp.workingMinutes)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {emp.overtimeMinutes > 0 ? formatMinutes(emp.overtimeMinutes) : "0"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{emp.lateMinutes}</TableCell>
                  <TableCell className="text-right tabular-nums">${emp.payrollAmount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium">
                <TableCell>{rows.length} employees</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">{formatMinutes(totals.workingMinutes)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMinutes(totals.overtimeMinutes)}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.lateMinutes}</TableCell>
                <TableCell className="text-right tabular-nums">${totals.payroll.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
