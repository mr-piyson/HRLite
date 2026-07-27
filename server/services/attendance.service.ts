import {
  attendanceLogRepository,
  attendanceRepository,
  employeeRepository,
  kioskConfigRepository,
} from "@/server/repositories"
import {
  type AttendancePolicy,
  DEFAULT_POLICY,
  LogType,
} from "@/server/domain/attendance"
import { computeDailyAttendance } from "@/server/services/attendance-calculator"

function dayBounds(dateKey: string): { start: Date; end: Date } {
  const [y, m, d] = dateKey.split("-").map(Number)
  const start = new Date(y, m - 1, d)
  const end = new Date(y, m - 1, d + 1)
  return { start, end }
}

export async function getPolicy(): Promise<AttendancePolicy> {
  const config = await kioskConfigRepository.getActive()
  if (!config) return DEFAULT_POLICY
  return {
    workdayStart: config.workdayStart,
    lateGraceMinutes: config.lateGraceMinutes,
    standardWorkMinutes: config.standardWorkMinutes,
    halfDayMinutes: config.halfDayMinutes,
  }
}

export async function regenerateAttendance(
  employeeId: string,
  dateKey: string,
) {
  const { start, end } = dayBounds(dateKey)
  const [logs, employee, policy] = await Promise.all([
    attendanceLogRepository.forEmployeeInRange(employeeId, start, end),
    employeeRepository.getById(employeeId),
    getPolicy(),
  ])

  const computed = computeDailyAttendance(
    dateKey,
    logs.map((l) => ({ logTime: l.logTime, logType: l.logType })),
    policy,
  )

  return attendanceRepository.upsertDaily(employeeId, dateKey, {
    employeeId,
    supplierId: employee?.supplierId ?? null,
    date: dateKey,
    timeIn: computed.timeIn,
    timeOut: computed.timeOut,
    workingMinutes: computed.workingMinutes,
    overtimeMinutes: computed.overtimeMinutes,
    lateMinutes: computed.lateMinutes,
    breakMinutes: computed.breakMinutes,
    status: computed.status,
    createdFromLog: logs[logs.length - 1]?.id ?? null,
  })
}

export async function hasOpenSession(
  employeeId: string,
  dateKey: string,
): Promise<boolean> {
  const { start, end } = dayBounds(dateKey)
  const last = await attendanceLogRepository.findLastInRange(
    employeeId,
    start,
    end,
  )
  return last?.logType === LogType.IN
}
