"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import type { Employee } from "@prisma/client"
import { DocumentTypeLabel } from "@/server/domain/employee"

interface EmployeeEditFormProps {
  employee: Employee | undefined
  isLoading?: boolean
  onSaved?: () => void
  onCancelled?: () => void
}

export function EmployeeEditForm({
  employee,
  isLoading,
  onSaved,
  onCancelled,
}: EmployeeEditFormProps) {
  const [empCode, setEmpCode] = useState(employee?.empCode ?? "")
  const [fullName, setFullName] = useState(employee?.fullName ?? "")
  const [designation, setDesignation] = useState(employee?.designation ?? "")
  const [department, setDepartment] = useState(employee?.department ?? "")
  const [project, setProject] = useState(employee?.project ?? "")
  const [contactNo, setContactNo] = useState(employee?.contactNo ?? "")
  const [supplierId, setSupplierId] = useState<string | null>(employee?.supplierId ?? null)
  const [isActive, setIsActive] = useState(employee?.isActive ?? true)
  const [nationality, setNationality] = useState(employee?.nationality ?? "")
  const [documentType, setDocumentType] = useState<string | null>(employee?.documentType ?? null)
  const [documentNumber, setDocumentNumber] = useState(employee?.documentNumber ?? "")

  const utils = trpc.useUtils()
  const { data: suppliers } = trpc.supplier.list.useQuery()
  const { data: settings } = trpc.general.get.useQuery()

  const updateMutation = trpc.employee.update.useMutation({
    onSuccess: () => {
      utils.employee.list.invalidate()
      toast.success("Employee updated")
      onSaved?.()
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (!employee) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Employee not found</p>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      id: employee.id,
      data: {
        empCode,
        fullName,
        designation: designation || undefined,
        department: department || undefined,
        project: project || undefined,
        contactNo: contactNo || undefined,
        nationality: nationality || undefined,
        documentType: documentType || undefined,
        documentNumber: documentNumber || undefined,
        supplierId,
        isActive,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Employee Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="empCode">Employee Code *</Label>
              <Input id="empCode" value={empCode} onChange={(e) => setEmpCode(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="designation">Designation</Label>
              <Input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="project">Project</Label>
              <Input id="project" value={project} onChange={(e) => setProject(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactNo">Contact No.</Label>
              <Input id="contactNo" value={contactNo} onChange={(e) => setContactNo(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Document Type</Label>
              <Select value={documentType ?? "none"} onValueChange={(v) => setDocumentType(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {Object.entries(DocumentTypeLabel).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="documentNumber">Document Number</Label>
              <Input id="documentNumber" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Supplier</Label>
              <Select
                value={supplierId ?? "none"}
                onValueChange={(v) => setSupplierId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{settings?.companyName ?? "Direct Employee"}</SelectItem>
                  {suppliers?.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.supplierName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Allow employee to use the kiosk</p>
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
