import { EmployeeTable } from "@/components/directory/employee-table"

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <p className="text-sm text-muted-foreground">
          Manage employee records, designations, and supplier assignments
        </p>
      </div>
      <EmployeeTable />
    </div>
  )
}
