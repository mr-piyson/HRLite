import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, publicProcedure, protectedProcedure, mapDomainError } from "@/server/trpc/trpc"
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
import { logAudit } from "@/server/services/audit.service"
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
  activeConfig: protectedProcedure.query(() =>
    kioskConfigRepository.getActive(),
  ),

  bySlug: protectedProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(({ input }) =>
      kioskConfigRepository.getBySlug(input.slug),
    ),

  listActive: protectedProcedure.query(async () => {
    const configs = await kioskConfigRepository.list()
    return configs
      .filter((c) => c.isActive)
      .map((c) => ({
        id: c.id,
        kioskName: c.kioskName,
        slug: c.slug,
        location: c.location,
        projectName: c.project?.name ?? null,
      }))
  }),

  validateToken: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await validateKioskToken(input.token)
      await logAudit(
        { userId: ctx.session.user.id, ipAddress: ctx.ipAddress, userAgent: ctx.deviceName },
        "kiosk.token.validate",
        "kiosk",
        undefined,
        { valid: result.valid },
      )
      return result
    }),

  regenerateToken: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const token = await regenerateKioskToken(input.id)
      await logAudit(
        { userId: ctx.session.user.id, ipAddress: ctx.ipAddress, userAgent: ctx.deviceName },
        "kiosk.token.regenerate",
        "kiosk",
        input.id,
      )
      return { token }
    }),

  lookup: protectedProcedure
    .input(z.object({ empCode: z.string().min(1), kioskToken: z.string().min(1) }))
    .query(async ({ input }) => {
      await assertKioskToken(input.kioskToken)
      return lookupEmployee(input.empCode.trim().toUpperCase())
    }),

  punch: protectedProcedure
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
        const result = await punch({
          method: input.method,
          value: input.value,
          pin: input.pin,
          context: {
            ipAddress: ctx.ipAddress,
            deviceName: input.deviceName ?? ctx.deviceName,
            kioskId: input.kioskId,
            kioskToken: input.kioskToken,
          },
        })
        await logAudit(
          { userId: ctx.session.user.id, ipAddress: ctx.ipAddress, userAgent: ctx.deviceName },
          "kiosk.punch",
          "attendance",
          result.employee?.id,
          {
            method: input.method,
            action: result.action,
            employeeCode: input.value,
            employeeName: result.employee?.fullName,
          },
        )
        return result
      } catch (err) {
        mapDomainError(err)
      }
    }),

  getActiveEmployees: protectedProcedure
    .input(kioskTokenInput)
    .query(async ({ input }) => {
      await assertKioskToken(input.kioskToken)
      try {
        return await getActiveEmployeesWithStatus(input.kioskToken)
      } catch (err) {
        mapDomainError(err)
      }
    }),

  verifyAdminPin: protectedProcedure
    .input(z.object({ pin: z.string().min(1), kioskToken: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertKioskToken(input.kioskToken)
      const valid = await verifyAdminPin(input.pin, ctx.ipAddress)
      await logAudit(
        { userId: ctx.session.user.id, ipAddress: ctx.ipAddress, userAgent: ctx.deviceName },
        "kiosk.admin_pin.verify",
        "kiosk",
        undefined,
        { valid },
      )
      return { valid }
    }),

  adminPunch: protectedProcedure
    .input(z.object({ employeeId: z.string().min(1), kioskToken: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertKioskToken(input.kioskToken)
      try {
        const result = await adminPunch(input.employeeId, input.kioskToken)
        await logAudit(
          { userId: ctx.session.user.id, ipAddress: ctx.ipAddress, userAgent: ctx.deviceName },
          "kiosk.admin_punch",
          "attendance",
          result.employee?.id,
          {
            action: result.action,
            employeeName: result.employee?.fullName,
          },
        )
        return result
      } catch (err) {
        mapDomainError(err)
      }
    }),
})
