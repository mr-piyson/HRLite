"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SupplierEditForm } from "@/components/directory/supplier-edit-form";
import { SupplierAttendanceTable } from "@/components/directory/supplier-attendance-table";
import Link from "next/link";
import { ArrowLeft, Edit2 } from "lucide-react";

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isAdmin = useIsAdmin();
  const [editing, setEditing] = useState(false);
  const { data: _supplier, isLoading } = trpc.supplier.getById.useQuery({ id });
  const supplier = _supplier ?? undefined;

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Edit {supplier?.supplierName}</h1>
            <p className="text-sm text-muted-foreground">{supplier?.supplierCode}</p>
          </div>
        </div>
        <SupplierEditForm
          supplier={supplier}
          isLoading={isLoading}
          onSaved={() => setEditing(false)}
          onCancelled={() => setEditing(false)}
        />
      </div>
    );
  }

  if (isLoading || !supplier) {
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
          <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/suppliers" />}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{supplier.supplierName}</h1>
            <p className="text-sm text-muted-foreground">{supplier.supplierCode}</p>
          </div>
          <Badge variant={supplier.isActive ? "default" : "secondary"}>
            {supplier.isActive ? "Active" : "Inactive"}
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
          <CardTitle className="text-sm font-medium">Supplier Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Contact Person</dt>
              <dd className="font-medium">{supplier.contactPerson ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{supplier.contactNum1 ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{supplier.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="font-medium">{supplier.address ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <SupplierAttendanceTable supplierId={supplier.id} />
    </div>
  );
}
