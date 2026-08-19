import { SupplierTable } from "@/components/directory/supplier-table"

export default function SuppliersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
        <p className="text-sm text-muted-foreground">
          Manage contractor and vendor companies that supply outsourced workers
        </p>
      </div>
      <SupplierTable />
    </div>
  )
}
