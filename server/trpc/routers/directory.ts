import { z } from "zod"
import { router, adminProcedure, protectedProcedure, mapDomainError } from "@/server/trpc/trpc"
import {
  employeeRepository,
  supplierRepository,
  rateHistoryRepository,
} from "@/server/repositories"
import { DomainError } from "@/server/domain/attendance"
import { effectiveRateFor } from "@/server/domain/employee"
import { todayKey } from "@/lib/utils"

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected yyyy-mm-dd")

export const supplierRouter = router({
  list: protectedProcedure.query(() => supplierRepository.list()),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) =>
      supplierRepository.getById(input.id),
    ),

  create: adminProcedure
    .input(
      z.object({
        supplierCode: z.string().min(1),
        supplierName: z.string().min(1),
        contactPerson: z.string().optional(),
        contactNum1: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await supplierRepository.create(input)
      } catch (err) {
        mapDomainError(err)
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          supplierCode: z.string().min(1).optional(),
          supplierName: z.string().min(1).optional(),
          contactPerson: z.string().optional(),
          contactNum1: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")),
          address: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const existing = await supplierRepository.getById(input.id)
        if (!existing) {
          throw new DomainError("Supplier not found", "NOT_FOUND")
        }
        return await supplierRepository.update(input.id, input.data)
      } catch (err) {
        mapDomainError(err)
      }
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(({ input }) =>
      supplierRepository.update(input.id, { isActive: input.isActive }),
    ),
})

export const employeeRouter = router({
  list: protectedProcedure.query(() => employeeRepository.list()),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) =>
      employeeRepository.getById(input.id),
    ),

  create: adminProcedure
    .input(
      z.object({
        empCode: z.string().min(1),
        fullName: z.string().min(1),
        designation: z.string().optional(),
        department: z.string().optional(),
        projectId: z.string().nullable().optional(),
        contactNo: z.string().optional(),
        hourRate: z.number().min(0).default(0),
        currency: z.string().optional(),
        nationality: z.string().optional(),
        documentType: z.string().optional(),
        documentNumber: z.string().optional(),
        supplierId: z.string().nullable().optional(),
        rfid: z.string().optional(),
        pin: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const employee = await employeeRepository.create({
          ...input,
          supplierId: input.supplierId ?? null,
          projectId: input.projectId ?? null,
        })
        await rateHistoryRepository.create({
          employeeId: employee.id,
          hourRate: input.hourRate,
          currency: input.currency ?? "BHD",
          effectiveDate: todayKey(),
        })
        return employee
      } catch (err) {
        mapDomainError(err)
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          empCode: z.string().min(1).optional(),
          fullName: z.string().min(1).optional(),
          designation: z.string().optional(),
          department: z.string().optional(),
          projectId: z.string().nullable().optional(),
          contactNo: z.string().optional(),
          nationality: z.string().optional(),
          documentType: z.string().optional(),
          documentNumber: z.string().optional(),
          supplierId: z.string().nullable().optional(),
          rfid: z.string().optional(),
          pin: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const existing = await employeeRepository.getById(input.id)
        if (!existing) {
          throw new DomainError("Employee not found", "NOT_FOUND")
        }
        return await employeeRepository.update(input.id, {
          ...input.data,
          supplierId: input.data.supplierId ?? null,
          projectId: input.data.projectId ?? null,
        })
      } catch (err) {
        mapDomainError(err)
      }
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(({ input }) =>
      employeeRepository.update(input.id, { isActive: input.isActive }),
    ),

  changeRate: adminProcedure
    .input(
      z.object({
        employeeId: z.string(),
        hourRate: z.number().min(0),
        effectiveDate: dateKey,
        currency: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const employee = await employeeRepository.getById(input.employeeId)
        if (!employee) {
          throw new DomainError("Employee not found", "NOT_FOUND")
        }
        await rateHistoryRepository.create({
          employeeId: input.employeeId,
          hourRate: input.hourRate,
          currency: input.currency ?? employee.currency ?? "BHD",
          effectiveDate: input.effectiveDate,
          reason: input.reason,
          createdById: ctx.session.user.id,
        })
        const history = await rateHistoryRepository.listForEmployee(input.employeeId)
        const current = effectiveRateFor(todayKey(), history)
        return employeeRepository.update(input.employeeId, {
          hourRate: current.hourRate,
          currency: current.currency,
        })
      } catch (err) {
        mapDomainError(err)
      }
    }),

  rateHistory: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(({ input }) =>
      rateHistoryRepository.listForEmployee(input.employeeId),
    ),
})
