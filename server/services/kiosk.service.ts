import {
  attendanceLogRepository,
  employeeRepository,
} from "@/server/repositories"
import {
  DomainError,
  type IdentificationMethod,
  LogType,
} from "@/server/domain/attendance"
import {
  getStrategy,
  type IdentificationRequest,
} from "@/server/identification"
import {
  hasOpenSession,
  regenerateAttendance,
} from "@/server/services/attendance.service"
import { toDateKey } from "@/server/services/attendance-calculator"

export interface KioskContext {
  deviceId?: string
  deviceName?: string
  ipAddress?: string
  kioskId?: string
}

export interface PunchInput extends IdentificationRequest {
  context?: KioskContext
}

export interface PunchResult {
  employee: { id: string; fullName: string; empCode: string; photo: string | null }
  action: "IN" | "OUT"
  time: Date
  workingMinutes: number
  status: string
}

const DUPLICATE_WINDOW_SECONDS = 10

export async function punch(input: PunchInput): Promise<PunchResult> {
  const strategy = getStrategy(input.method as IdentificationMethod)
  const employee = await strategy.resolve(input)

  if (!employee) {
    throw new DomainError("Employee not recognized", "NOT_FOUND")
  }
  if (!employee.isActive) {
    throw new DomainError("Employee is inactive", "FORBIDDEN")
  }

  const now = new Date()
  const dateKey = toDateKey(now)

  const open = await hasOpenSession(employee.id, dateKey)
  const logType = open ? LogType.OUT : LogType.IN

  const since = new Date(now.getTime() - DUPLICATE_WINDOW_SECONDS * 1000)
  const lastLog = await attendanceLogRepository.findLastSince(
    employee.id,
    since,
  )
  if (lastLog && lastLog.logType === logType) {
    throw new DomainError(
      "Duplicate scan detected. Please wait a moment.",
      "CONFLICT",
    )
  }

  await attendanceLogRepository.create({
    employeeId: employee.id,
    logTime: now,
    logType,
    deviceId: input.context?.deviceId,
    deviceName: input.context?.deviceName,
    ipAddress: input.context?.ipAddress,
    kioskId: input.context?.kioskId,
  })

  const attendance = await regenerateAttendance(
    employee.id,
    dateKey,
  )

  return {
    employee: {
      id: employee.id,
      fullName: employee.fullName,
      empCode: employee.empCode,
      photo: employee.photo,
    },
    action: logType === LogType.IN ? "IN" : "OUT",
    time: now,
    workingMinutes: attendance.workingMinutes,
    status: attendance.status,
  }
}

export async function lookupEmployee(empCode: string) {
  const employee = await employeeRepository.getByCode(empCode)
  if (!employee) return null
  return {
    id: employee.id,
    fullName: employee.fullName,
    empCode: employee.empCode,
    designation: employee.designation,
    photo: employee.photo,
    supplierName: employee.supplier?.supplierName ?? "Direct Employee",
  }
}
