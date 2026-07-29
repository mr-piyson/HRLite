import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, publicProcedure, mapDomainError } from "@/server/trpc/trpc"
import {
  punch,
  lookupEmployee,
  verifyAdminPin,
  getActiveEmployeesWithStatus,
  adminPunch,
  validateKioskToken,
  regenerateKioskToken,
  generateKioskToken,
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

const kioskTokenInput = z.object({ kioskToken: z.string().min(1) })

async function assertKioskToken(kioskToken: string) {
  const result = await validateKioskToken(kioskToken)
  if (!result.valid) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or missing kiosk token",
    })
  }
  return result
}

export const kioskRouter = router({
  activeConfig: publicProcedure.query(() =>
    kioskConfigRepository.getActive(),
  ),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(({ input }) =>
      kioskConfigRepository.getBySlug(input.slug),
    ),

  listActive: publicProcedure.query(async () => {
    const configs = await kioskConfigRepository.list()
    return configs
      .filter((c) => c.isActive)
      .map((c) => ({
        id: c.id,
        kioskName: c.kioskName,
        slug: c.slug,
        location: c.location,
      }))
  }),

  validateToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return validateKioskToken(input.token)
    }),

  regenerateToken: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const token = await regenerateKioskToken(input.id)
      return { token }
    }),

  lookup: publicProcedure
    .input(z.object({ empCode: z.string().min(1), kioskToken: z.string().min(1) }))
    .query(async ({ input }) => {
      await assertKioskToken(input.kioskToken)
      return lookupEmployee(input.empCode.trim().toUpperCase())
    }),

  punch: publicProcedure
    .input(
      z.object({
        method: methodEnum,
        value: z.string().min(1, "Value is required"),
        pin: z.string().optional(),
        kioskId: z.string().optional(),
        deviceName: z.string().optional(),
        kioskToken: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertKioskToken(input.kioskToken)
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

  getActiveEmployees: publicProcedure
    .input(kioskTokenInput)
    .query(async ({ input }) => {
      await assertKioskToken(input.kioskToken)
      try {
        return await getActiveEmployeesWithStatus()
      } catch (err) {
        return mapDomainError(err)
      }
    }),

  verifyAdminPin: publicProcedure
    .input(z.object({ pin: z.string().min(1), kioskToken: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await assertKioskToken(input.kioskToken)
      const valid = await verifyAdminPin(input.pin)
      return { valid }
    }),

  adminPunch: publicProcedure
    .input(z.object({ employeeId: z.string().min(1), kioskToken: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await assertKioskToken(input.kioskToken)
      try {
        return await adminPunch(input.employeeId)
      } catch (err) {
        return mapDomainError(err)
      }
    }),
})
