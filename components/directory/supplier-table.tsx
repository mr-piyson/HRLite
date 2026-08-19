"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useIsAdmin } from "@/hooks/use-is-admin";
import { SupplierFormDialog } from "@/components/directory/supplier-form-dialog";
import { MoreHorizontal, Eye, Edit, Power, PowerOff } from "lucide-react";

export function SupplierTable() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { data: suppliers, isLoading } = trpc.supplier.list.useQuery();
  const { data: settings } = trpc.general.get.useQuery();
  const utils = trpc.useUtils();

  const toggleActive = trpc.supplier.setActive.useMutation({
    onSuccess: () => {
      utils.supplier.list.invalidate();
      toast.success("Supplier status updated");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isLoading ? "Loading..." : `${suppliers?.length ?? 0} supplier companies`}
        </p>
        {isAdmin && <SupplierFormDialog />}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="text-xs">Code</TableHead>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Contact</TableHead>
              <TableHead className="text-xs">Phone</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-center text-xs">Active</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="h-9">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j} className="py-1.5">
                        <Skeleton className="h-3 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : (
                  <>
                    <TableRow
                      className="cursor-pointer bg-muted/30 h-9"
                      onClick={() => router.push("/suppliers/direct")}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/suppliers/direct") }}
                    >
                      <TableCell className="font-mono text-xs py-1.5">DIRECT</TableCell>
                      <TableCell className="font-medium text-sm py-1.5">{settings?.companyName ?? "Direct Supplier"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-1.5">—</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-1.5">{settings?.companyPhone ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-1.5">—</TableCell>
                      <TableCell className="text-center py-1.5">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Direct
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5" />
                    </TableRow>
                    {suppliers?.map((s) => (
                      <TableRow key={s.id} className="cursor-pointer h-9" onClick={() => router.push(`/suppliers/${s.id}`)} tabIndex={0} role="button" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/suppliers/${s.id}`) }}>
                        <TableCell className="font-mono text-xs py-1.5">{s.supplierCode}</TableCell>
                        <TableCell className="font-medium text-sm py-1.5">{s.supplierName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1.5">{s.contactPerson ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1.5">{s.contactNum1 ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1.5">{s.email ?? "—"}</TableCell>
                        <TableCell className="text-center py-1.5">
                          {isAdmin && (
                            <Switch
                              checked={s.isActive}
                              onCheckedChange={() => {
                                if (s.isActive && !window.confirm("Deactivate this supplier?")) return
                                toggleActive.mutate({ id: s.id, isActive: !s.isActive })
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon" className="size-7">
                                  <MoreHorizontal className="size-3.5" />
                                </Button>
                              }
                              onClick={(e) => e.stopPropagation()}
                            ></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/suppliers/${s.id}`);
                                }}
                              >
                                <Eye className="mr-2 size-3.5" />
                                View Details
                              </DropdownMenuItem>
                              {isAdmin && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/suppliers/${s.id}`);
                                  }}
                                >
                                  <Edit className="mr-2 size-3.5" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {isAdmin && <DropdownMenuSeparator />}
                              {isAdmin && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleActive.mutate({ id: s.id, isActive: !s.isActive });
                                  }}
                                >
                                  {s.isActive ? (
                                    <PowerOff className="mr-2 size-3.5 text-destructive" />
                                  ) : (
                                    <Power className="mr-2 size-3.5 text-emerald-500" />
                                  )}
                                  {s.isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
            {!isLoading && suppliers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-xs text-muted-foreground">
                  No supplier companies found. Add your first supplier.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
