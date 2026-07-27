import { z } from "zod"
import { router, publicProcedure, mapDomainError } from "@/server/trpc/trpc"
import {
  employeeRepository,
  supplierRepository,
} from "@/server/repositories"

export const supplierRouter = router({
  list: publicProcedure.query(() => supplierRepository.list()),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) =>
      supplierRepository.getById(input.id),
    ),

  create: publicProcedure
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
    .mutation(({ input }) =>
      supplierRepository.create(input),
    ),

  update: publicProcedure
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
          const { DomainError } = await import("@/server/domain/attendance")
          throw new DomainError("Supplier not found", "NOT_FOUND")
        }
        return supplierRepository.update(input.id, input.data)
      } catch (err) {
        return mapDomainError(err)
      }
    }),

  setActive: publicProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(({ input }) =>
      supplierRepository.update(input.id, { isActive: input.isActive }),
    ),
})

export const employeeRouter = router({
  list: publicProcedure.query(() => employeeRepository.list()),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) =>
      employeeRepository.getById(input.id),
    ),

  create: publicProcedure
    .input(
      z.object({
        empCode: z.string().min(1),
        fullName: z.string().min(1),
        designation: z.string().optional(),
        department: z.string().optional(),
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
    .mutation(({ input }) =>
      employeeRepository.create({
        ...input,
        supplierId: input.supplierId ?? null,
      }),
    ),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          empCode: z.string().min(1).optional(),
          fullName: z.string().min(1).optional(),
          designation: z.string().optional(),
          department: z.string().optional(),
          hourRate: z.number().min(0).optional(),
          currency: z.string().optional(),
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
          const { DomainError } = await import("@/server/domain/attendance")
          throw new DomainError("Employee not found", "NOT_FOUND")
        }
        return employeeRepository.update(input.id, {
          ...input.data,
          supplierId: input.data.supplierId ?? null,
        })
      } catch (err) {
        return mapDomainError(err)
      }
    }),

  setActive: publicProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(({ input }) =>
      employeeRepository.update(input.id, { isActive: input.isActive }),
    ),
})
