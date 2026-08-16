"use client";

import { useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeEditForm } from "@/components/directory/employee-edit-form";
import Link from "next/link";
import { ArrowLeft, Edit2, Eye } from "lucide-react";
import { DocumentTypeLabel, CurrencySymbol, type Currency, type DocumentType } from "@/server/domain/employee";

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [editing, setEditing] = useState(false);
  const { data: _employee, isLoading } = trpc.employee.getById.useQuery({ id });
  const { data: settings } = trpc.general.get.useQuery();
  const employee = _employee ?? undefined;

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Edit {employee?.fullName}</h1>
            <p className="text-sm text-muted-foreground">{employee?.empCode}</p>
          </div>
        </div>
        <EmployeeEditForm
          employee={employee}
          isLoading={isLoading}
          onSaved={() => setEditing(false)}
          onCancelled={() => setEditing(false)}
        />
      </div>
    );
  }

  if (isLoading || !employee) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/employees" />}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{employee.fullName}</h1>
            <p className="text-sm text-muted-foreground">{employee.empCode}</p>
          </div>
          <Badge variant={employee.isActive ? "default" : "secondary"}>
            {employee.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="mr-1 size-4" />
            Edit
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Designation</dt>
              <dd className="font-medium">{employee.designation ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Department</dt>
              <dd className="font-medium">{employee.department ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Project</dt>
              <dd className="font-medium">{employee.project ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contact No.</dt>
              <dd className="font-medium">{employee.contactNo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nationality</dt>
              <dd className="font-medium">{employee.nationality ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Document</dt>
              <dd className="font-medium">
                {employee.documentType
                  ? `${DocumentTypeLabel[employee.documentType as DocumentType]}: ${employee.documentNumber ?? "—"}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Hourly Rate</dt>
              <dd className="font-medium">{CurrencySymbol[(employee.currency as Currency) ?? "USD"]}{employee.hourRate.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Supplier</dt>
              <dd className="font-medium">{employee.supplier?.supplierName ?? settings?.companyName ?? "Direct Employee"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">{new Date(employee.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
