import {
  attendanceLogRepository,
  attendanceRepository,
} from "@/server/repositories"
import { AttendanceStatus, LogType } from "@/server/domain/attendance"

export interface SupplierAttendanceStat {
  supplierId: string | null
  supplierName: string
  present: number
  workingMinutes: number
}

export interface DashboardData {
  date: string
  totalMarked: number
  currentlyWorking: number
  checkedIn: number
  checkedOut: number
  absentToday: number
  lateToday: number
  incompleteToday: number
  averageWorkingMinutes: number
  supplierBreakdown: SupplierAttendanceStat[]
  recent: {
    id: string
    employeeName: string
    logType: string
    logTime: Date
  }[]
}

export async function getDashboard(
  dateKey: string,
): Promise<DashboardData> {
  const [rows, recentLogs] = await Promise.all([
    attendanceRepository.forDate(dateKey),
    attendanceLogRepository.recent(12),
  ])

  const checkedIn = rows.filter((r) => r.timeIn).length
  const checkedOut = rows.filter((r) => r.timeOut).length
  const currentlyWorking = rows.filter((r) => r.timeIn && !r.timeOut).length
  const lateToday = rows.filter((r) => r.status === AttendanceStatus.Late).length
  const incompleteToday = rows.filter(
    (r) => r.status === AttendanceStatus.Incomplete,
  ).length
  const absentToday = rows.filter(
    (r) => r.status === AttendanceStatus.Absent,
  ).length

  const worked = rows.filter((r) => r.workingMinutes > 0)
  const averageWorkingMinutes = worked.length
    ? Math.round(
        worked.reduce((s, r) => s + r.workingMinutes, 0) / worked.length,
      )
    : 0

  const supplierMap = new Map<string, SupplierAttendanceStat>()
  for (const r of rows) {
    const key = r.supplierId ?? "__direct__"
    const g =
      supplierMap.get(key) ??
      ({
        supplierId: r.supplierId,
        supplierName: r.supplier?.supplierName ?? "Direct Employees",
        present: 0,
        workingMinutes: 0,
      } satisfies SupplierAttendanceStat)
    if (r.timeIn) g.present++
    g.workingMinutes += r.workingMinutes
    supplierMap.set(key, g)
  }

  return {
    date: dateKey,
    totalMarked: rows.length,
    currentlyWorking,
    checkedIn,
    checkedOut,
    absentToday,
    lateToday,
    incompleteToday,
    averageWorkingMinutes,
    supplierBreakdown: [...supplierMap.values()].sort(
      (a, b) => b.present - a.present,
    ),
    recent: recentLogs.map((l) => ({
      id: l.id,
      employeeName: l.employee.fullName,
      logType: l.logType,
      logTime: l.logTime,
    })),
  }
}

export { LogType }
