import { z } from "zod"
import { router, publicProcedure, mapDomainError } from "@/server/trpc/trpc"
import { getDashboard } from "@/server/services/dashboard.service"
import { buildReport, buildDailyBreakdownReport } from "@/server/services/report.service"
import { attendanceRepository, attendanceLogRepository, employeeRepository } from "@/server/repositories"
import {
  adminUpdateAttendance,
  adminManualCreateAttendance,
} from "@/server/services/admin-attendance.service"
import { DomainError } from "@/server/domain/attendance"

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected yyyy-mm-dd")

export const dashboardRouter = router({
  today: publicProcedure
    .input(z.object({ date: dateKey }))
    .query(({ input }) => getDashboard(input.date)),
})

export const attendanceRouter = router({
  byDate: publicProcedure
    .input(z.object({ date: dateKey }))
    .query(({ input }) =>
      attendanceRepository.forDate(input.date),
    ),

  logs: publicProcedure
    .input(z.object({ take: z.number().int().min(1).max(100).default(50) }))
    .query(({ input }) =>
      attendanceLogRepository.recent(input.take),
    ),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const record = attendanceRepository.getById(input.id)
      if (!record) {
        throw new DomainError("Attendance record not found", "NOT_FOUND")
      }
      return record
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          timeIn: z.string().datetime().nullable().optional(),
          timeOut: z.string().datetime().nullable().optional(),
          status: z.string().optional(),
          breakMinutes: z.number().int().min(0).optional(),
          reason: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const mapped: {
          timeIn?: Date | null
          timeOut?: Date | null
          status?: string
          breakMinutes?: number
          reason?: string
        } = {}
        if (input.data.timeIn !== undefined) {
          mapped.timeIn = input.data.timeIn ? new Date(input.data.timeIn) : null
        }
        if (input.data.timeOut !== undefined) {
          mapped.timeOut = input.data.timeOut ? new Date(input.data.timeOut) : null
        }
        if (input.data.status !== undefined) mapped.status = input.data.status
        if (input.data.breakMinutes !== undefined) mapped.breakMinutes = input.data.breakMinutes
        if (input.data.reason !== undefined) mapped.reason = input.data.reason

        return adminUpdateAttendance(input.id, mapped)
      } catch (err) {
        return mapDomainError(err)
      }
    }),

  manualCreate: publicProcedure
    .input(
      z.object({
        employeeId: z.string(),
        date: dateKey,
        timeIn: z.string().datetime().nullable().optional(),
        timeOut: z.string().datetime().nullable().optional(),
        status: z.string().optional(),
        breakMinutes: z.number().int().min(0).optional(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const mapped: {
          timeIn?: Date | null
          timeOut?: Date | null
          status?: string
          breakMinutes?: number
          reason?: string
        } = {}
        if (input.timeIn !== undefined) {
          mapped.timeIn = input.timeIn ? new Date(input.timeIn) : null
        }
        if (input.timeOut !== undefined) {
          mapped.timeOut = input.timeOut ? new Date(input.timeOut) : null
        }
        if (input.status !== undefined) mapped.status = input.status
        if (input.breakMinutes !== undefined) mapped.breakMinutes = input.breakMinutes
        if (input.reason !== undefined) mapped.reason = input.reason

        return adminManualCreateAttendance(input.employeeId, input.date, mapped)
      } catch (err) {
        return mapDomainError(err)
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const record = await attendanceRepository.getById(input.id)
        if (!record) {
          throw new DomainError("Attendance record not found", "NOT_FOUND")
        }
        return attendanceRepository.delete(input.id)
      } catch (err) {
        return mapDomainError(err)
      }
    }),

  regenerateFromLogs: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { regenerateAttendance } = await import("@/server/services/attendance.service")
      const record = await attendanceRepository.getById(input.id)
      if (!record) {
        throw new DomainError("Attendance record not found", "NOT_FOUND")
      }
      return regenerateAttendance(record.employeeId, record.date)
    }),
})

export const attendanceLogRouter = router({
  list: publicProcedure
    .input(z.object({ take: z.number().int().min(1).max(200).default(50) }))
    .query(({ input }) =>
      attendanceLogRepository.recent(input.take),
    ),

  create: publicProcedure
    .input(
      z.object({
        employeeId: z.string(),
        logTime: z.string().datetime(),
        logType: z.enum(["IN", "OUT", "BREAK_IN", "BREAK_OUT"]),
        deviceName: z.string().optional(),
        notes: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const employee = await employeeRepository.getById(input.employeeId)
      if (!employee) {
        throw new DomainError("Employee not found", "NOT_FOUND")
      }
      const log = await attendanceLogRepository.create({
        employeeId: input.employeeId,
        logTime: new Date(input.logTime),
        logType: input.logType,
        deviceName: input.deviceName,
        notes: input.reason
          ? `Admin entry: ${input.reason}${input.notes ? ` — ${input.notes}` : ""}`
          : input.notes,
        ipAddress: "admin",
      })

      const { toDateKey } = await import("@/server/services/attendance-calculator")
      const { regenerateAttendance } = await import("@/server/services/attendance.service")
      const dateKey = toDateKey(new Date(input.logTime))
      await regenerateAttendance(input.employeeId, dateKey)

      return log
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          logTime: z.string().datetime().optional(),
          logType: z.enum(["IN", "OUT", "BREAK_IN", "BREAK_OUT"]).optional(),
          deviceName: z.string().optional(),
          notes: z.string().optional(),
          reason: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const log = await attendanceLogRepository.getById(input.id)
      if (!log) {
        throw new DomainError("Attendance log not found", "NOT_FOUND")
      }
      const updateData: Record<string, unknown> = {}
      if (input.data.logTime) updateData.logTime = new Date(input.data.logTime)
      if (input.data.logType) updateData.logType = input.data.logType
      if (input.data.deviceName !== undefined) updateData.deviceName = input.data.deviceName
      const notesParts: string[] = []
      if (input.data.reason) notesParts.push(`Admin edit: ${input.data.reason}`)
      if (input.data.notes) notesParts.push(input.data.notes)
      updateData.notes = notesParts.length > 0 ? notesParts.join(" — ") : log.notes

      const updated = await attendanceLogRepository.update(input.id, updateData)

      const { toDateKey } = await import("@/server/services/attendance-calculator")
      const { regenerateAttendance } = await import("@/server/services/attendance.service")
      const logDate = input.data.logTime ? new Date(input.data.logTime) : log.logTime
      await regenerateAttendance(log.employeeId, toDateKey(logDate))

      return updated
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const log = await attendanceLogRepository.getById(input.id)
      if (!log) {
        throw new DomainError("Attendance log not found", "NOT_FOUND")
      }
      const { toDateKey } = await import("@/server/services/attendance-calculator")
      const dateKey = toDateKey(log.logTime)
      const employeeId = log.employeeId

      await attendanceLogRepository.delete(input.id)

      const { regenerateAttendance } = await import("@/server/services/attendance.service")
      await regenerateAttendance(employeeId, dateKey)

      return { success: true }
    }),
})

export const reportRouter = router({
  attendance: publicProcedure
    .input(z.object({ from: dateKey, to: dateKey }))
    .query(({ input }) =>
      buildReport(input.from, input.to),
    ),

  dailyBreakdown: publicProcedure
    .input(z.object({ from: dateKey, to: dateKey }))
    .query(({ input }) =>
      buildDailyBreakdownReport(input.from, input.to),
    ),
})
