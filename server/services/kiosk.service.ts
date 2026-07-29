import { prisma } from "@/server/db/prisma"
import {
  attendanceLogRepository,
  attendanceRepository,
  employeeRepository,
  kioskConfigRepository,
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

  await prisma.$transaction(async () => {
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

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const config = await kioskConfigRepository.getActive()
  if (!config?.adminPin) return false
  return config.adminPin === pin
}

export interface EmployeeWithStatus {
  id: string
  fullName: string
  empCode: string
  designation: string | null
  photo: string | null
  attended: boolean
  isClockedIn: boolean
}

function dayBounds(dateKey: string): { start: Date; end: Date } {
  const [y, m, d] = dateKey.split("-").map(Number)
  const start = new Date(y, m - 1, d)
  const end = new Date(y, m - 1, d + 1)
  return { start, end }
}

export async function getActiveEmployeesWithStatus(): Promise<EmployeeWithStatus[]> {
  const [employees, config] = await Promise.all([
    employeeRepository.listActive(),
    kioskConfigRepository.getActive(),
  ])

  const now = new Date()
  const dateKey = toDateKey(now)
  const { start, end } = dayBounds(dateKey)

  const [allAttendance, allLogs] = await Promise.all([
    attendanceRepository.forDate(dateKey),
    prisma.attendanceLog.findMany({
      where: {
        employeeId: { in: employees.map((e) => e.id) },
        logTime: { gte: start, lt: end },
      },
      orderBy: { logTime: "desc" },
      select: { employeeId: true, logType: true },
    }),
  ])

  const attendanceByEmployee = new Map(
    allAttendance.map((a) => [a.employeeId, a]),
  )

  const lastLogByEmployee = new Map<string, string>()
  for (const log of allLogs) {
    if (!lastLogByEmployee.has(log.employeeId)) {
      lastLogByEmployee.set(log.employeeId, log.logType)
    }
  }

  return employees.map((emp) => ({
    id: emp.id,
    fullName: emp.fullName,
    empCode: emp.empCode,
    designation: emp.designation,
    photo: emp.photo,
    attended: attendanceByEmployee.has(emp.id),
    isClockedIn: lastLogByEmployee.get(emp.id) === LogType.IN,
  }))
}

export function generateKioskToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function validateKioskToken(
  token: string,
): Promise<{ valid: boolean; kioskName?: string; slug?: string }> {
  const config = await kioskConfigRepository.getByToken(token)
  if (!config) return { valid: false }
  return { valid: true, kioskName: config.kioskName, slug: config.slug }
}

export async function regenerateKioskToken(
  configId: string,
): Promise<string> {
  const token = generateKioskToken()
  await kioskConfigRepository.updateToken(configId, token)
  return token
}

export async function adminPunch(employeeId: string): Promise<PunchResult> {
  const employee = await employeeRepository.getById(employeeId)

  if (!employee) {
    throw new DomainError("Employee not found", "NOT_FOUND")
  }
  if (!employee.isActive) {
    throw new DomainError("Employee is inactive", "FORBIDDEN")
  }

  const now = new Date()
  const dateKey = toDateKey(now)

  const open = await hasOpenSession(employee.id, dateKey)
  const logType = open ? LogType.OUT : LogType.IN

  const since = new Date(now.getTime() - DUPLICATE_WINDOW_SECONDS * 1000)

  await prisma.$transaction(async () => {
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
    })
  })

  const attendance = await regenerateAttendance(employee.id, dateKey)

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
