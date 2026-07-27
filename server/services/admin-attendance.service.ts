import {
  attendanceRepository,
  attendanceLogRepository,
  employeeRepository,
  kioskConfigRepository,
} from "@/server/repositories"
import {
  AttendanceStatus,
  type AttendancePolicy,
  DEFAULT_POLICY,
  DomainError,
} from "@/server/domain/attendance"

export interface AdminAttendanceInput {
  timeIn?: Date | null
  timeOut?: Date | null
  status?: string
  breakMinutes?: number
}

function recalculateFromTimes(
  dateKey: string,
  timeIn: Date | null,
  timeOut: Date | null,
  breakMinutes: number,
  policy: AttendancePolicy,
): {
  workingMinutes: number
  overtimeMinutes: number
  lateMinutes: number
  status: string
} {
  const workingMinutes =
    timeIn && timeOut && timeOut > timeIn
      ? Math.max(0, Math.round((timeOut.getTime() - timeIn.getTime()) / 60000) - breakMinutes)
      : 0

  const overtimeMinutes = Math.max(0, workingMinutes - policy.standardWorkMinutes)

  let lateMinutes = 0
  let status: string = AttendanceStatus.Absent

  if (timeIn && timeOut && timeOut > timeIn) {
    const [h, m] = policy.workdayStart.split(":").map(Number)
    const scheduledStart = new Date(`${dateKey}T00:00:00`)
    scheduledStart.setHours(h || 0, m || 0, 0, 0)
    const graceLimit = new Date(scheduledStart.getTime() + policy.lateGraceMinutes * 60000)

    if (timeIn > graceLimit) {
      lateMinutes = Math.max(0, Math.round((timeIn.getTime() - scheduledStart.getTime()) / 60000))
    }

    if (workingMinutes < policy.halfDayMinutes) {
      status = AttendanceStatus.HalfDay
    } else if (lateMinutes > 0) {
      status = AttendanceStatus.Late
    } else {
      status = AttendanceStatus.Present
    }
  } else if (timeIn && !timeOut) {
    status = AttendanceStatus.Incomplete
    const [h, m] = policy.workdayStart.split(":").map(Number)
    const scheduledStart = new Date(`${dateKey}T00:00:00`)
    scheduledStart.setHours(h || 0, m || 0, 0, 0)
    const graceLimit = new Date(scheduledStart.getTime() + policy.lateGraceMinutes * 60000)
    if (timeIn > graceLimit) {
      lateMinutes = Math.max(0, Math.round((timeIn.getTime() - scheduledStart.getTime()) / 60000))
    }
  }

  return { workingMinutes, overtimeMinutes, lateMinutes, status }
}

export async function adminUpdateAttendance(
  attendanceId: string,
  input: AdminAttendanceInput & { reason?: string },
) {
  const record = await attendanceRepository.getById(attendanceId)
  if (!record) {
    throw new DomainError("Attendance record not found", "NOT_FOUND")
  }

  const config = await kioskConfigRepository.getActive()
  const policy: AttendancePolicy = config
    ? {
        workdayStart: config.workdayStart,
        lateGraceMinutes: config.lateGraceMinutes,
        standardWorkMinutes: config.standardWorkMinutes,
        halfDayMinutes: config.halfDayMinutes,
      }
    : DEFAULT_POLICY

  const timeIn = input.timeIn !== undefined ? input.timeIn : record.timeIn
  const timeOut = input.timeOut !== undefined ? input.timeOut : record.timeOut
  const breakMinutes = input.breakMinutes ?? record.breakMinutes

  const computed = recalculateFromTimes(
    record.date,
    timeIn,
    timeOut,
    breakMinutes,
    policy,
  )

  const updated = await attendanceRepository.update(attendanceId, {
    timeIn,
    timeOut,
    breakMinutes,
    workingMinutes: computed.workingMinutes,
    overtimeMinutes: computed.overtimeMinutes,
    lateMinutes: computed.lateMinutes,
    status: input.status ?? computed.status,
    adminEditReason: input.reason ?? null,
  })

  await attendanceLogRepository.create({
    employeeId: record.employeeId,
    logTime: new Date(),
    logType: "ADMIN_EDIT",
    deviceName: "Admin Panel",
    notes: input.reason
      ? `Admin edit: ${input.reason}`
      : "Admin edit",
    ipAddress: "admin",
  })

  return updated
}

export async function adminManualCreateAttendance(
  employeeId: string,
  dateKey: string,
  input: AdminAttendanceInput & { reason?: string },
) {
  const employee = await employeeRepository.getById(employeeId)
  if (!employee) {
    throw new DomainError("Employee not found", "NOT_FOUND")
  }

  const existing = await attendanceRepository.getDaily(employeeId, dateKey)
  if (existing) {
    throw new DomainError("Attendance record already exists for this employee on this date", "CONFLICT")
  }

  const config = await kioskConfigRepository.getActive()
  const policy: AttendancePolicy = config
    ? {
        workdayStart: config.workdayStart,
        lateGraceMinutes: config.lateGraceMinutes,
        standardWorkMinutes: config.standardWorkMinutes,
        halfDayMinutes: config.halfDayMinutes,
      }
    : DEFAULT_POLICY

  const timeIn = input.timeIn ?? null
  const timeOut = input.timeOut ?? null
  const breakMinutes = input.breakMinutes ?? 0

  const computed = recalculateFromTimes(dateKey, timeIn, timeOut, breakMinutes, policy)

  const created = await attendanceRepository.create({
    employeeId,
    supplierId: employee.supplierId,
    date: dateKey,
    timeIn,
    timeOut,
    breakMinutes,
    workingMinutes: computed.workingMinutes,
    overtimeMinutes: computed.overtimeMinutes,
    lateMinutes: computed.lateMinutes,
    status: input.status ?? computed.status,
    adminEditReason: input.reason ?? "Manual entry",
  })

  await attendanceLogRepository.create({
    employeeId,
    logTime: new Date(),
    logType: "MANUAL_ENTRY",
    deviceName: "Admin Panel",
    notes: input.reason
      ? `Manual entry: ${input.reason}`
      : "Manual entry",
    ipAddress: "admin",
  })

  return created
}

export { recalculateFromTimes }
