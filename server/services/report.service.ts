import { attendanceRepository, employeeRepository, appSettingRepository, rateHistoryRepository } from "@/server/repositories"
import { AttendanceStatus } from "@/server/domain/attendance"
import { effectiveRateFor } from "@/server/domain/employee"

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

async function directSupplierLabel(): Promise<string> {
  const settings = await appSettingRepository.get()
  return settings.companyName ?? "Direct Employees"
}

export async function buildReport(
  from: string,
  to: string,
): Promise<AttendanceReport> {
  const rows = await attendanceRepository.forRange(from, to)
  const directLabel = await directSupplierLabel()

  const employeeIds = [...new Set(rows.map((r) => r.employeeId))]
  const history = await rateHistoryRepository.listForEmployees(employeeIds)
  const historyByEmployee = new Map<string, typeof history>()
  for (const h of history) {
    const list = historyByEmployee.get(h.employeeId) ?? []
    list.push(h)
    historyByEmployee.set(h.employeeId, list)
  }

  const byEmployee = new Map<string, EmployeeRow>()
  let missingCheckouts = 0

  for (const r of rows) {
    if (r.status === AttendanceStatus.Incomplete) missingCheckouts++

    const key = r.employeeId
    const existing = byEmployee.get(key)
    const rate = effectiveRateFor(r.date, historyByEmployee.get(r.employeeId) ?? [])
    const hourRate = rate.hourRate ?? 0
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
        supplierName: r.supplier?.supplierName ?? directLabel,
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
  const directLabel = await directSupplierLabel()

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
        supplierName: r.supplier?.supplierName ?? directLabel,
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

export interface DailyBreakdownExportEmployee {
  sNo: number
  iqamaNo: string
  contactNo: string
  fullName: string
  designation: string
  project: string
  ratePerHour: number
  /** date (yyyy-mm-dd) -> hours worked that day (integer, rounded). */
  daily: Record<string, number>
  totalHours: number
  absenceDays: number
  hasAnyHours: boolean
}

export interface DailyBreakdownExport {
  title: string
  from: string
  to: string
  dateColumns: string[]
  employees: DailyBreakdownExportEmployee[]
}

/**
 * Aggregated daily breakdown for the xlsx export. Unlike
 * `buildDailyBreakdownReport`, every active employee is included (even those
 * with no attendance in range, so they surface as "on leave" rows), and daily
 * values are integer hours rather than minutes.
 */
export async function buildDailyBreakdownExport(
  from: string,
  to: string,
  title: string,
): Promise<DailyBreakdownExport> {
  const rows = await attendanceRepository.forRange(from, to)
  const dateColumns = dateRange(from, to)

  const byEmployee = new Map<
    string,
    { daily: Record<string, number>; totalHours: number }
  >()

  for (const r of rows) {
    if (!dateColumns.includes(r.date)) continue
    const hours = Math.round(r.workingMinutes / 60)
    let emp = byEmployee.get(r.employeeId)
    if (!emp) {
      emp = { daily: {}, totalHours: 0 }
      byEmployee.set(r.employeeId, emp)
    }
    emp.daily[r.date] = hours
    emp.totalHours += hours
  }

  const allEmployees = await employeeRepository.list()
  const activeEmployees = allEmployees.filter((e) => e.isActive)
  const history = await rateHistoryRepository.listForEmployees(
    activeEmployees.map((e) => e.id),
  )
  const historyByEmployee = new Map<string, typeof history>()
  for (const h of history) {
    const list = historyByEmployee.get(h.employeeId) ?? []
    list.push(h)
    historyByEmployee.set(h.employeeId, list)
  }

  const employees = activeEmployees
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((e, idx) => {
      const agg = byEmployee.get(e.id) ?? { daily: {}, totalHours: 0 }
      const daily: Record<string, number> = {}
      let absenceDays = 0
      for (const d of dateColumns) {
        const hours = agg.daily[d] ?? 0
        daily[d] = hours
        if (hours === 0) absenceDays++
      }
      // Days with no recorded hours are only "absences" (red cells) when the
      // employee worked at least one day in the range. Otherwise the whole row
      // is treated as on leave / resigned (yellow).
      if (agg.totalHours === 0) absenceDays = 0
      const rate = effectiveRateFor(from, historyByEmployee.get(e.id) ?? [])
      return {
        sNo: idx + 1,
        iqamaNo: e.documentNumber ?? "",
        contactNo: e.contactNo ?? "",
        fullName: e.fullName,
        designation: e.designation ?? "",
        project: e.project?.name ?? "",
        ratePerHour: rate.hourRate ?? 0,
        daily,
        totalHours: agg.totalHours,
        absenceDays,
        hasAnyHours: agg.totalHours > 0,
      }
    })

  return { title, from, to, dateColumns, employees }
}
