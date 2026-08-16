"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinutes } from "@/server/services/attendance-calculator";
import { downloadCSV } from "@/lib/csv";
import { todayKey } from "@/lib/utils";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function labelForRange(from: string, to: string) {
  return `${from}_${to}`;
}

const csvHeaders = ["Employee", "Code", "Working Hrs", "Overtime", "Late (min)", "Payroll"];

function employeeToRow(emp: {
  fullName: string;
  empCode: string;
  workingMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  payrollAmount: number;
}) {
  return [
    emp.fullName,
    emp.empCode,
    formatMinutes(emp.workingMinutes),
    emp.overtimeMinutes > 0 ? formatMinutes(emp.overtimeMinutes) : "0",
    String(emp.lateMinutes),
    `$${emp.payrollAmount.toFixed(2)}`,
  ];
}

export default function ReportsPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayKey());
  const [queryKey, setQueryKey] = useState({ from, to });

  const { data, isLoading, isFetching } = trpc.report.attendance.useQuery(queryKey, {
    enabled: !!queryKey.from && !!queryKey.to,
  });

  const {
    data: dailyData,
    isLoading: dailyLoading,
    isFetching: dailyFetching,
  } = trpc.report.dailyBreakdown.useQuery(queryKey, {
    enabled: !!queryKey.from && !!queryKey.to,
  });

  const exportXlsx = trpc.report.exportDailyBreakdownXlsx.useMutation();

  const handleRefresh = () => setQueryKey({ from, to });

  const handleExportEmployees = () => {
    if (!data) return;
    const rows = data.employees.map(employeeToRow);
    downloadCSV(`All_Employees_${labelForRange(from, to)}.csv`, csvHeaders, rows, { Range: `${from} to ${to}` });
  };

  const handleExportSupplier = (group: {
    supplierName: string;
    employees: {
      fullName: string;
      empCode: string;
      workingMinutes: number;
      overtimeMinutes: number;
      lateMinutes: number;
      payrollAmount: number;
    }[];
    totalWorkingMinutes: number;
    totalOvertimeMinutes: number;
    totalPayroll: number;
  }) => {
    const rows = group.employees.map(employeeToRow);
    rows.push([
      "Subtotal",
      "",
      formatMinutes(group.totalWorkingMinutes),
      formatMinutes(group.totalOvertimeMinutes),
      "",
      `$${group.totalPayroll.toFixed(2)}`,
    ]);
    const safeName = group.supplierName.replace(/[^a-zA-Z0-9_-]/g, "_");
    downloadCSV(`${safeName}_${labelForRange(from, to)}.csv`, csvHeaders, rows, {
      Range: `${from} to ${to}`,
      Supplier: group.supplierName,
    });
  };

  const handleExportAllSuppliers = () => {
    if (!data) return;
    const rows: string[][] = [];
    for (const group of data.suppliers) {
      if (rows.length > 0) {
        rows.push(["", "", "", "", "", ""]);
      }
      rows.push([`--- ${group.supplierName} ---`, "", "", "", "", ""]);
      for (const emp of group.employees) {
        rows.push(employeeToRow(emp));
      }
      rows.push([
        `Subtotal (${group.supplierName})`,
        "",
        formatMinutes(group.totalWorkingMinutes),
        formatMinutes(group.totalOvertimeMinutes),
        "",
        `$${group.totalPayroll.toFixed(2)}`,
      ]);
    }
    downloadCSV(`All_Suppliers_${labelForRange(from, to)}.csv`, csvHeaders, rows, { Range: `${from} to ${to}` });
  };

  const handleExportDailyBreakdown = async () => {
    if (!dailyData) return;
    const { filename, base64 } = await exportXlsx.mutateAsync({ from, to });
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and view attendance reports by date range</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-44">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="w-44">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button size="sm" onClick={handleRefresh} disabled={isFetching || dailyFetching}>
            {isFetching || dailyFetching ? "Loading..." : "Generate"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.summary.headcount ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Working Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data ? formatMinutes(data.summary.totalWorkingMinutes) : "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Overtime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {data ? formatMinutes(data.summary.totalOvertimeMinutes) : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Missing Checkouts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{data?.summary.missingCheckouts ?? "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employee">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="employee">By Employee</TabsTrigger>
            <TabsTrigger value="supplier">By Supplier</TabsTrigger>
            <TabsTrigger value="dailyBreakdown">Daily Breakdown</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {data && (
              <>
                <Button variant="outline" size="sm" onClick={handleExportEmployees}>
                  <Download className="mr-1 size-4" />
                  Export All Employees
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportAllSuppliers}>
                  <FileSpreadsheet className="mr-1 size-4" />
                  Export All Suppliers
                </Button>
              </>
            )}
            {dailyData && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDailyBreakdown}
                disabled={exportXlsx.isPending}
              >
                {exportXlsx.isPending ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-1 size-4" />
                )}
                {exportXlsx.isPending ? "Exporting..." : "Export Daily Breakdown (Excel)"}
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="employee" className="mt-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Working Hrs</TableHead>
                  <TableHead className="text-right">Overtime</TableHead>
                  <TableHead className="text-right">Late (min)</TableHead>
                  <TableHead className="text-right">Payroll</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : data?.employees.map((emp) => (
                      <TableRow key={emp.employeeId}>
                        <TableCell className="font-medium">{emp.fullName}</TableCell>
                        <TableCell className="font-mono text-xs">{emp.empCode}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp.supplierName}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMinutes(emp.workingMinutes)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {emp.overtimeMinutes > 0 ? formatMinutes(emp.overtimeMinutes) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{emp.lateMinutes}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          ${emp.payrollAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                {!isLoading && data?.employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      No records found for the selected date range
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="supplier" className="mt-4">
          <div className="space-y-6">
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <Skeleton className="mb-4 h-5 w-48" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ))
              : data?.suppliers.map((group) => (
                  <div key={group.supplierId ?? "__direct__"} className="rounded-lg border">
                    <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                      <div>
                        <h3 className="font-semibold">{group.supplierName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {group.headcount} employees · {formatMinutes(group.totalWorkingMinutes)} total
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">${group.totalPayroll.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Total Payroll</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleExportSupplier(group)}>
                          <Download className="mr-1 size-3.5" />
                          CSV
                        </Button>
                      </div>
                    </div>
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
                        {group.employees.map((emp) => (
                          <TableRow key={emp.employeeId}>
                            <TableCell className="font-medium">{emp.fullName}</TableCell>
                            <TableCell className="font-mono text-xs">{emp.empCode}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMinutes(emp.workingMinutes)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {emp.overtimeMinutes > 0 ? formatMinutes(emp.overtimeMinutes) : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{emp.lateMinutes}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              ${emp.payrollAmount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/20 font-medium">
                          <TableCell colSpan={2}>Subtotal</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMinutes(group.totalWorkingMinutes)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMinutes(group.totalOvertimeMinutes)}
                          </TableCell>
                          <TableCell />
                          <TableCell className="text-right tabular-nums">${group.totalPayroll.toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ))}
          </div>
        </TabsContent>

        <TabsContent value="dailyBreakdown" className="mt-4">
          <div className="overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Supplier</TableHead>
                  {dailyData?.dateColumns.map((d) => {
                    const [, m, day] = d.split("-");
                    return (
                      <TableHead key={d} className="text-right text-xs">
                        {m}/{day}
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-right">Total Hrs</TableHead>
                  <TableHead className="text-right">Absence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : dailyData?.employees.map((emp) => (
                      <TableRow key={emp.employeeId}>
                        <TableCell className="sticky left-0 bg-background font-medium">{emp.fullName}</TableCell>
                        <TableCell className="font-mono text-xs">{emp.empCode}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp.supplierName}</TableCell>
                        {dailyData.dateColumns.map((d) => {
                          const mins = emp.daily[d];
                          const hasHours = mins !== undefined && mins > 0;
                          return (
                            <TableCell
                              key={d}
                              className={`text-right tabular-nums ${!hasHours ? "text-muted-foreground/50" : ""}`}
                            >
                              {hasHours ? formatMinutes(mins) : "—"}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatMinutes(emp.totalWorkingMinutes)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {emp.absenceDays > 0 ? (
                            <span className="text-red-600 font-medium">{emp.absenceDays}</span>
                          ) : (
                            "0"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                {!dailyLoading && dailyData?.employees.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4 + (dailyData?.dateColumns.length ?? 0) + 2}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No records found for the selected date range
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
