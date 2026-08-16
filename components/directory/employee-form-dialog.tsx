"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { DocumentTypeLabel, CurrencyLabel } from "@/server/domain/employee";

export function EmployeeFormDialog() {
  const [open, setOpen] = useState(false);
  const [empCode, setEmpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [project, setProject] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [hourRate, setHourRate] = useState("0");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [nationality, setNationality] = useState("");
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [currency, setCurrency] = useState("SAR");

  const utils = trpc.useUtils();
  const { data: suppliers } = trpc.supplier.list.useQuery();
  const { data: settings } = trpc.general.get.useQuery();

  const createMutation = trpc.employee.create.useMutation({
    onSuccess: () => {
      utils.employee.list.invalidate();
      toast.success("Employee created");
      handleClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleClose = () => {
    setOpen(false);
    setEmpCode("");
    setFullName("");
    setDesignation("");
    setDepartment("");
    setProject("");
    setContactNo("");
    setHourRate("0");
    setSupplierId(null);
    setNationality("");
    setDocumentType(null);
    setDocumentNumber("");
    setCurrency(settings?.defaultCurrency ?? "SAR");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      empCode,
      fullName,
      designation: designation || undefined,
      department: department || undefined,
      project: project || undefined,
      contactNo: contactNo || undefined,
      hourRate: parseFloat(hourRate) || 0,
      currency,
      nationality: nationality || undefined,
      documentType: documentType || undefined,
      documentNumber: documentNumber || undefined,
      supplierId
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        handleClose();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="mr-1 size-4" />
            Add Employee
          </Button>
        }
      ></DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>New Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CurrencyLabel).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-1">
              <Label htmlFor="documentNumber">Document Number</Label>
              <Input id="documentNumber" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="hourRate">Hourly Rate</Label>
              <Input
                id="hourRate"
                type="number"
                step="0.5"
                value={hourRate}
                onChange={(e) => setHourRate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Supplier</Label>
              <Select
                value={supplierId ?? "none"}
                onValueChange={(v: string | null) => setSupplierId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{settings?.companyName ?? "Direct Employee"}</SelectItem>
                  {suppliers
                    ?.filter((s) => s.isActive)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.supplierName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
