"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { EmployeeFormDialog } from "@/components/directory/employee-form-dialog";
import { MoreHorizontal, Eye, Edit, Power, PowerOff } from "lucide-react";
import { CurrencySymbol, type Currency } from "@/server/domain/employee";

export function EmployeeTable() {
  const router = useRouter();
  const { data: employees, isLoading } = trpc.employee.list.useQuery();
  const utils = trpc.useUtils();

  const toggleActive = trpc.employee.setActive.useMutation({
    onSuccess: () => {
      utils.employee.list.invalidate();
      toast.success("Employee status updated");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : `${employees?.length ?? 0} employees`}
        </p>
        <EmployeeFormDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Nationality</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-center">Active</TableHead>
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
              : employees?.map((emp) => (
                  <TableRow key={emp.id} className="cursor-pointer" onClick={() => router.push(`/employees/${emp.id}`)} tabIndex={0} role="button" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/employees/${emp.id}`) }}>
                    <TableCell className="font-mono text-xs">{emp.empCode}</TableCell>
                    <TableCell className="font-medium">{emp.fullName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emp.designation ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emp.department ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emp.nationality ?? "—"}</TableCell>
                    <TableCell>
                      {emp.supplier ? (
                        <Badge variant="secondary">{emp.supplier.supplierName}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Direct</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{CurrencySymbol[(emp.currency as Currency) ?? "USD"]}{emp.hourRate.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={emp.isActive}
                        onCheckedChange={() => {
                          if (emp.isActive && !window.confirm("Deactivate this employee? They will not be able to clock in.")) return
                          toggleActive.mutate({
                            id: emp.id,
                            isActive: !emp.isActive,
                          })
                        }}
                      />
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
                              router.push(`/employees/${emp.id}`);
                            }}
                          >
                            <Eye className="mr-2 size-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/employees/${emp.id}`);
                            }}
                          >
                            <Edit className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActive.mutate({
                                id: emp.id,
                                isActive: !emp.isActive,
                              });
                            }}
                          >
                            {emp.isActive ? (
                              <PowerOff className="mr-2 size-4 text-destructive" />
                            ) : (
                              <Power className="mr-2 size-4 text-emerald-500" />
                            )}
                            {emp.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && employees?.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  No employees found. Add your first employee.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
