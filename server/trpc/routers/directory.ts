import { z } from "zod"
import { router, adminProcedure, protectedProcedure, mapDomainError } from "@/server/trpc/trpc"
import {
  employeeRepository,
  supplierRepository,
} from "@/server/repositories"
import { DomainError } from "@/server/domain/attendance"

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
        return await employeeRepository.create({
          ...input,
          supplierId: input.supplierId ?? null,
        })
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
          throw new DomainError("Employee not found", "NOT_FOUND")
        }
        return await employeeRepository.update(input.id, {
          ...input.data,
          supplierId: input.data.supplierId ?? null,
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
})
