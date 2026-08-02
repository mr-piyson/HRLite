import { z } from "zod"
import { router, adminProcedure, protectedProcedure, mapDomainError } from "@/server/trpc/trpc"
import { getDashboard } from "@/server/services/dashboard.service"
import { buildReport, buildDailyBreakdownReport } from "@/server/services/report.service"
import { attendanceRepository, attendanceLogRepository, employeeRepository } from "@/server/repositories"
import {
  adminUpdateAttendance,
  adminManualCreateAttendance,
} from "@/server/services/admin-attendance.service"
import { getCalendarData } from "@/server/services/attendance-calendar.service"
import { DomainError } from "@/server/domain/attendance"

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected yyyy-mm-dd")

export const dashboardRouter = router({
  today: protectedProcedure
    .input(z.object({ date: dateKey }))
    .query(({ input }) => getDashboard(input.date)),
})

export const attendanceRouter = router({
  byDate: protectedProcedure
    .input(z.object({ date: dateKey }))
    .query(({ input }) =>
      attendanceRepository.forDate(input.date),
    ),

  logs: protectedProcedure
    .input(z.object({ take: z.number().int().min(1).max(100).default(50) }))
    .query(({ input }) =>
      attendanceLogRepository.recent(input.take),
    ),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const record = attendanceRepository.getById(input.id)
      if (!record) {
        throw new DomainError("Attendance record not found", "NOT_FOUND")
      }
      return record
    }),

  update: adminProcedure
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
        mapDomainError(err)
      }
    }),

  manualCreate: adminProcedure
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
        mapDomainError(err)
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const record = await attendanceRepository.getById(input.id)
        if (!record) {
          throw new DomainError("Attendance record not found", "NOT_FOUND")
        }
        if (record.approvalStatus === "approved") {
          throw new DomainError("Cannot delete an approved attendance record", "FORBIDDEN")
        }
        return attendanceRepository.delete(input.id)
      } catch (err) {
        mapDomainError(err)
      }
    }),

  approve: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const record = await attendanceRepository.getById(input.id)
        if (!record) {
          throw new DomainError("Attendance record not found", "NOT_FOUND")
        }
        if (record.approvalStatus === "approved") {
          throw new DomainError("Attendance record is already approved", "CONFLICT")
        }
        await attendanceRepository.update(input.id, {
          approvalStatus: "approved",
          approvedAt: new Date(),
          approvedById: ctx.session.user.id,
        })
        await attendanceLogRepository.create({
          employeeId: record.employeeId,
          logTime: new Date(),
          logType: "APPROVED",
          deviceName: "Admin Panel",
          notes: `Approved by ${ctx.session.user.name ?? ctx.session.user.id}`,
          ipAddress: "admin",
        })
        return { success: true }
      } catch (err) {
        mapDomainError(err)
      }
    }),

  approveBatch: adminProcedure
    .input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      employeeIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const records = await attendanceRepository.listPendingForDate(input.date, input.employeeIds)
        if (records.length === 0) {
          throw new DomainError("No pending attendance records found to approve", "NOT_FOUND")
        }
        const now = new Date()
        for (const record of records) {
          await attendanceRepository.update(record.id, {
            approvalStatus: "approved",
            approvedAt: now,
            approvedById: ctx.session.user.id,
          })
          await attendanceLogRepository.create({
            employeeId: record.employeeId,
            logTime: now,
            logType: "APPROVED",
            deviceName: "Admin Panel",
            notes: `Approved by ${ctx.session.user.name ?? ctx.session.user.id}`,
            ipAddress: "admin",
          })
        }
        return { count: records.length }
      } catch (err) {
        mapDomainError(err)
      }
    }),

  revertApproval: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const record = await attendanceRepository.getById(input.id)
        if (!record) {
          throw new DomainError("Attendance record not found", "NOT_FOUND")
        }
        if (record.approvalStatus !== "approved") {
          throw new DomainError("Attendance record is not approved", "CONFLICT")
        }
        await attendanceRepository.update(input.id, {
          approvalStatus: "pending",
          approvedAt: null,
          approvedById: null,
        })
        return { success: true }
      } catch (err) {
        mapDomainError(err)
      }
    }),

  calendarByMonth: protectedProcedure
    .input(z.object({
      year: z.number().int().min(2000).max(2100),
      month: z.number().int().min(1).max(12),
    }))
    .query(({ input }) => getCalendarData(input.year, input.month)),

  regenerateFromLogs: adminProcedure
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
  list: protectedProcedure
    .input(z.object({ take: z.number().int().min(1).max(200).default(50) }))
    .query(({ input }) =>
      attendanceLogRepository.recent(input.take),
    ),

  create: adminProcedure
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

  update: adminProcedure
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

  delete: adminProcedure
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
  attendance: protectedProcedure
    .input(z.object({ from: dateKey, to: dateKey }))
    .query(({ input }) =>
      buildReport(input.from, input.to),
    ),

  dailyBreakdown: protectedProcedure
    .input(z.object({ from: dateKey, to: dateKey }))
    .query(({ input }) =>
      buildDailyBreakdownReport(input.from, input.to),
    ),
})
