"use client";

import { trpc } from "@/lib/trpc/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SupplierAttendanceTable } from "@/components/directory/supplier-attendance-table";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

export default function DirectSupplierPage() {
  const isAdmin = useIsAdmin();
  const { data: settings, isLoading } = trpc.general.get.useQuery();

  if (isLoading || !settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const companyName = settings.companyName ?? "Direct Supplier";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/suppliers" />}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{companyName}</h1>
            <p className="text-sm text-muted-foreground">DIRECT</p>
          </div>
          <Badge>Active</Badge>
        </div>
        {isAdmin && (
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/settings/general" />}>
            <Settings className="mr-1 size-4" />
            Company Settings
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Company Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Contact Person</dt>
              <dd className="font-medium">—</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{settings.companyPhone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">—</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="font-medium">{settings.companyAddress ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tax ID</dt>
              <dd className="font-medium">{settings.companyTaxId ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <SupplierAttendanceTable supplierId={null} />
    </div>
  );
}
