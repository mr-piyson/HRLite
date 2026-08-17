"use client"

import { useState, useMemo } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Search, UserPlus, UserMinus, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AssignEmployeesPanelProps {
  projectId: string
}

export function AssignEmployeesPanel({ projectId }: AssignEmployeesPanelProps) {
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const utils = trpc.useUtils()

  const { data: project, isLoading: projectLoading } = trpc.project.getById.useQuery(
    { id: projectId },
  )

  const { data: allEmployees = [], isLoading: employeesLoading } =
    trpc.employee.list.useQuery()

  const assignMutation = trpc.project.bulkAssign.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate()
      utils.project.getById.invalidate({ id: projectId })
      toast.success(`${selectedIds.size} employee(s) assigned`)
      setSelectedIds(new Set())
    },
    onError: (err) => toast.error(err.message),
  })

  const unassignMutation = trpc.project.unassignEmployee.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate()
      utils.project.getById.invalidate({ id: projectId })
      toast.success("Employee unassigned")
    },
    onError: (err) => toast.error(err.message),
  })

  const assignedIds = useMemo(
    () => new Set(project?.employees?.map((e) => e.id) ?? []),
    [project?.employees],
  )

  const availableEmployees = useMemo(
    () =>
      allEmployees.filter(
        (e) =>
          e.isActive &&
          !assignedIds.has(e.id) &&
          (search.trim() === "" ||
            e.fullName.toLowerCase().includes(search.toLowerCase()) ||
            e.empCode.toLowerCase().includes(search.toLowerCase())),
      ),
    [allEmployees, assignedIds, search],
  )

  const assignedEmployees = useMemo(
    () =>
      project?.employees?.filter(
        (e) =>
          search.trim() === "" ||
          e.fullName.toLowerCase().includes(search.toLowerCase()) ||
          e.empCode.toLowerCase().includes(search.toLowerCase()),
      ) ?? [],
    [project?.employees, search],
  )

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(availableEmployees.map((e) => e.id)))
  }

  const handleBulkAssign = () => {
    if (selectedIds.size === 0) return
    assignMutation.mutate({
      employeeIds: Array.from(selectedIds),
      projectId,
    })
  }

  const handleUnassign = (employeeId: string) => {
    unassignMutation.mutate({ employeeId })
  }

  if (projectLoading || employeesLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 flex-1">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="w-full bg-transparent border-0 p-0 text-sm focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {/* Assigned Employees */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">
            Assigned Employees
            <Badge variant="secondary" className="ml-2 text-xs">
              {assignedEmployees.length}
            </Badge>
          </h3>
        </div>
        {assignedEmployees.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            No employees assigned to this project
          </p>
        ) : (
          <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
            {assignedEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {emp.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{emp.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {emp.empCode} &middot; {emp.designation ?? "—"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnassign(emp.id)}
                  disabled={unassignMutation.isPending}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <UserMinus className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Employees */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">
            Available Employees
            <Badge variant="secondary" className="ml-2 text-xs">
              {availableEmployees.length}
            </Badge>
          </h3>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button size="sm" onClick={handleBulkAssign} disabled={assignMutation.isPending}>
                <UserPlus className="mr-1 size-3.5" />
                Assign Selected ({selectedIds.size})
              </Button>
            )}
            {availableEmployees.length > 0 && (
              <Button size="sm" variant="outline" onClick={selectAll}>
                Select All
              </Button>
            )}
          </div>
        </div>
        {availableEmployees.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            {search.trim()
              ? "No employees match your search"
              : "All active employees are already assigned"}
          </p>
        ) : (
          <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
            {availableEmployees.map((emp) => (
              <div
                key={emp.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors",
                  selectedIds.has(emp.id) && "bg-muted/50",
                )}
                onClick={() => toggleSelect(emp.id)}
              >
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    selectedIds.has(emp.id)
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30",
                  )}
                >
                  {selectedIds.has(emp.id) && (
                    <CheckCircle2 className="size-3.5" />
                  )}
                </div>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {emp.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{emp.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {emp.empCode} &middot; {emp.designation ?? "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
