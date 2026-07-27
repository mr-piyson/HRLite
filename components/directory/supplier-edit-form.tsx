"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import type { Supplier } from "@prisma/client"

interface SupplierEditFormProps {
  supplier: Supplier | undefined
  isLoading?: boolean
  onSaved?: () => void
  onCancelled?: () => void
}

export function SupplierEditForm({
  supplier,
  isLoading,
  onSaved,
  onCancelled,
}: SupplierEditFormProps) {
  const [supplierCode, setSupplierCode] = useState(supplier?.supplierCode ?? "")
  const [supplierName, setSupplierName] = useState(supplier?.supplierName ?? "")
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson ?? "")
  const [contactNum1, setContactNum1] = useState(supplier?.contactNum1 ?? "")
  const [email, setEmail] = useState(supplier?.email ?? "")
  const [address, setAddress] = useState(supplier?.address ?? "")
  const [isActive, setIsActive] = useState(supplier?.isActive ?? true)

  const utils = trpc.useUtils()
  const updateMutation = trpc.supplier.update.useMutation({
    onSuccess: () => {
      utils.supplier.list.invalidate()
      toast.success("Supplier updated")
      onSaved?.()
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (!supplier) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Supplier not found</p>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      id: supplier.id,
      data: {
        supplierCode,
        supplierName,
        contactPerson: contactPerson || undefined,
        contactNum1: contactNum1 || undefined,
        email: email || undefined,
        address: address || undefined,
        isActive,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Supplier Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="supplierCode">Supplier Code *</Label>
              <Input id="supplierCode" value={supplierCode} onChange={(e) => setSupplierCode(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="supplierName">Supplier Name *</Label>
              <Input id="supplierName" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="contactNum1">Phone Number</Label>
              <Input id="contactNum1" value={contactNum1} onChange={(e) => setContactNum1(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Allow this supplier's employees to use the kiosk</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancelled}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
