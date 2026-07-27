import { attendanceRepository } from "@/server/repositories"
import { AttendanceStatus } from "@/server/domain/attendance"

export interface EmployeeRow {
  employeeId: string
  empCode: string
  fullName: string
  designation: string | null
  supplierId: string | null
  supplierName: string
  hourRate: number
  daysPresent: number
  daysLate: number
  daysIncomplete: number
  workingMinutes: number
  overtimeMinutes: number
  lateMinutes: number
  payrollAmount: number
}

export interface SupplierGroup {
  supplierId: string | null
  supplierName: string
  employees: EmployeeRow[]
  totalWorkingMinutes: number
  totalOvertimeMinutes: number
  totalPayroll: number
  headcount: number
}

export interface AttendanceReport {
  from: string
  to: string
  employees: EmployeeRow[]
  suppliers: SupplierGroup[]
  summary: {
    totalWorkingMinutes: number
    totalOvertimeMinutes: number
    totalLateMinutes: number
    totalPayroll: number
    missingCheckouts: number
    headcount: number
  }
}

export interface DailyBreakdownEmployee {
  employeeId: string
  empCode: string
  fullName: string
  designation: string | null
  supplierName: string
  daily: Record<string, number>
  totalWorkingMinutes: number
  absenceDays: number
}

export interface DailyBreakdownReport {
  from: string
  to: string
  dateColumns: string[]
  employees: DailyBreakdownEmployee[]
}

const DIRECT_KEY = "__direct__"

export async function buildReport(
  from: string,
  to: string,
): Promise<AttendanceReport> {
  const rows = await attendanceRepository.forRange(from, to)

  const byEmployee = new Map<string, EmployeeRow>()
  let missingCheckouts = 0

  for (const r of rows) {
    if (r.status === AttendanceStatus.Incomplete) missingCheckouts++

    const key = r.employeeId
    const existing = byEmployee.get(key)
    const hourRate = r.employee.hourRate ?? 0
    const addPay = (r.workingMinutes / 60) * hourRate

    if (existing) {
      existing.workingMinutes += r.workingMinutes
      existing.overtimeMinutes += r.overtimeMinutes
      existing.lateMinutes += r.lateMinutes
      existing.payrollAmount += addPay
      if (r.status === AttendanceStatus.Present) existing.daysPresent++
      if (r.status === AttendanceStatus.Late) existing.daysLate++
      if (r.status === AttendanceStatus.Incomplete) existing.daysIncomplete++
    } else {
      byEmployee.set(key, {
        employeeId: r.employeeId,
        empCode: r.employee.empCode,
        fullName: r.employee.fullName,
        designation: r.employee.designation,
        supplierId: r.supplierId,
        supplierName: r.supplier?.supplierName ?? "Direct Employees",
        hourRate,
        daysPresent: r.status === AttendanceStatus.Present ? 1 : 0,
        daysLate: r.status === AttendanceStatus.Late ? 1 : 0,
        daysIncomplete: r.status === AttendanceStatus.Incomplete ? 1 : 0,
        workingMinutes: r.workingMinutes,
        overtimeMinutes: r.overtimeMinutes,
        lateMinutes: r.lateMinutes,
        payrollAmount: addPay,
      })
    }
  }

  const employees = [...byEmployee.values()].sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  )

  const groups = new Map<string, SupplierGroup>()
  for (const e of employees) {
    const gk = e.supplierId ?? DIRECT_KEY
    const g =
      groups.get(gk) ??
      ({
        supplierId: e.supplierId,
        supplierName: e.supplierName,
        employees: [],
        totalWorkingMinutes: 0,
        totalOvertimeMinutes: 0,
        totalPayroll: 0,
        headcount: 0,
      } satisfies SupplierGroup)
    g.employees.push(e)
    g.totalWorkingMinutes += e.workingMinutes
    g.totalOvertimeMinutes += e.overtimeMinutes
    g.totalPayroll += e.payrollAmount
    g.headcount++
    groups.set(gk, g)
  }

  const suppliers = [...groups.values()].sort((a, b) =>
    b.totalWorkingMinutes - a.totalWorkingMinutes,
  )

  const summary = employees.reduce(
    (acc, e) => {
      acc.totalWorkingMinutes += e.workingMinutes
      acc.totalOvertimeMinutes += e.overtimeMinutes
      acc.totalLateMinutes += e.lateMinutes
      acc.totalPayroll += e.payrollAmount
      return acc
    },
    {
      totalWorkingMinutes: 0,
      totalOvertimeMinutes: 0,
      totalLateMinutes: 0,
      totalPayroll: 0,
      missingCheckouts,
      headcount: employees.length,
    },
  )

  return { from, to, employees, suppliers, summary }
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = []
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  const current = new Date(start)
  while (current <= end) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, "0")
    const d = String(current.getDate()).padStart(2, "0")
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export async function buildDailyBreakdownReport(
  from: string,
  to: string,
): Promise<DailyBreakdownReport> {
  const rows = await attendanceRepository.forRange(from, to)
  const dateColumns = dateRange(from, to)
  const dateSet = new Set(dateColumns)

  const byEmployee = new Map<string, DailyBreakdownEmployee>()

  for (const r of rows) {
    if (!dateSet.has(r.date)) continue

    const key = r.employeeId
    let emp = byEmployee.get(key)
    if (!emp) {
      emp = {
        employeeId: r.employeeId,
        empCode: r.employee.empCode,
        fullName: r.employee.fullName,
        designation: r.employee.designation,
        supplierName: r.supplier?.supplierName ?? "Direct Employees",
        daily: {},
        totalWorkingMinutes: 0,
        absenceDays: 0,
      }
      byEmployee.set(key, emp)
    }

    emp.daily[r.date] = r.workingMinutes
    emp.totalWorkingMinutes += r.workingMinutes
    if (r.status === AttendanceStatus.Absent) {
      emp.absenceDays++
    }
  }

  const employees = [...byEmployee.values()].sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  )

  return { from, to, dateColumns, employees }
}
