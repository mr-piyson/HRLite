import { z } from "zod"
import { router, publicProcedure, mapDomainError } from "@/server/trpc/trpc"
import {
  punch,
  lookupEmployee,
  verifyAdminPin,
  getActiveEmployeesWithStatus,
  adminPunch,
} from "@/server/services/kiosk.service"
import { kioskConfigRepository } from "@/server/repositories"
import { IdentificationMethod } from "@/server/domain/attendance"

const methodEnum = z.enum([
  IdentificationMethod.CODE,
  IdentificationMethod.QR,
  IdentificationMethod.BARCODE,
  IdentificationMethod.RFID,
  IdentificationMethod.PIN,
])

export const kioskRouter = router({
  activeConfig: publicProcedure.query(() =>
    kioskConfigRepository.getActive(),
  ),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(({ input }) =>
      kioskConfigRepository.getBySlug(input.slug),
    ),

  lookup: publicProcedure
    .input(z.object({ empCode: z.string().min(1) }))
    .query(({ input }) =>
      lookupEmployee(input.empCode.trim().toUpperCase()),
    ),

  punch: publicProcedure
    .input(
      z.object({
        method: methodEnum,
        value: z.string().min(1, "Value is required"),
        pin: z.string().optional(),
        kioskId: z.string().optional(),
        deviceName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await punch({
          method: input.method,
          value: input.value,
          pin: input.pin,
          context: {
            ipAddress: ctx.ipAddress,
            deviceName: input.deviceName ?? ctx.deviceName,
            kioskId: input.kioskId,
          },
        })
      } catch (err) {
        return mapDomainError(err)
      }
    }),

  getActiveEmployees: publicProcedure.query(async () => {
    try {
      return await getActiveEmployeesWithStatus()
    } catch (err) {
      return mapDomainError(err)
    }
  }),

  verifyAdminPin: publicProcedure
    .input(z.object({ pin: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const valid = await verifyAdminPin(input.pin)
      return { valid }
    }),

  adminPunch: publicProcedure
    .input(z.object({ employeeId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        return await adminPunch(input.employeeId)
      } catch (err) {
        return mapDomainError(err)
      }
    }),
})
