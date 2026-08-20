import { z } from "zod"
import { router, adminProcedure } from "@/server/trpc/trpc"
import { kioskConfigRepository } from "@/server/repositories"
import { regenerateKioskToken, generateKioskToken } from "@/server/services/kiosk.service"
import { logAudit } from "@/server/services/audit.service"

const configShape = {
  kioskName: z.string().min(1),
  slug: z.string().min(1),
  deviceName: z.string().optional(),
  location: z.string().optional(),
  autoFullscreen: z.boolean(),
  autoResetAfterSuccess: z.boolean(),
  successScreenDuration: z.number().int().min(1).max(30),
  cameraEnabled: z.boolean(),
  qrCodeEnabled: z.boolean(),
  rfidEnabled: z.boolean(),
  pinEnabled: z.boolean(),
  faceRecognitionEnabled: z.boolean(),
  fingerprintEnabled: z.boolean(),
  projectId: z.string().nullable().optional(),
  workdayStart: z.string().regex(/^\d{2}:\d{2}$/),
  lateGraceMinutes: z.number().int().min(0).max(240),
  standardWorkMinutes: z.number().int().min(60).max(1440),
  halfDayMinutes: z.number().int().min(30).max(1440),
  adminPin: z.string().optional(),
}

export const settingsRouter = router({
  list: adminProcedure.query(() =>
    kioskConfigRepository.list(),
  ),

  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) =>
      kioskConfigRepository.getById(input.id),
    ),

  active: adminProcedure.query(() =>
    kioskConfigRepository.getActive(),
  ),

  create: adminProcedure
    .input(z.object(configShape))
    .mutation(async ({ ctx, input }) => {
      const token = generateKioskToken()
      const config = await kioskConfigRepository.create({ ...input, accessToken: token })
      await logAudit(
        { userId: ctx.session.user.id, ipAddress: ctx.ipAddress, userAgent: ctx.deviceName },
        "kiosk.config.create",
        "kiosk",
        config.id,
        { name: input.kioskName, slug: input.slug },
      )
      return config
    }),

  regenerateToken: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const token = await regenerateKioskToken(input.id)
      await logAudit(
        { userId: ctx.session.user.id, ipAddress: ctx.ipAddress, userAgent: ctx.deviceName },
        "kiosk.config.regenerate_token",
        "kiosk",
        input.id,
      )
      return { token }
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), data: z.object(configShape).partial() }))
    .mutation(async ({ ctx, input }) => {
      const config = await kioskConfigRepository.update(input.id, input.data)
      await logAudit(
        { userId: ctx.session.user.id, ipAddress: ctx.ipAddress, userAgent: ctx.deviceName },
        "kiosk.config.update",
        "kiosk",
        input.id,
        { changes: Object.keys(input.data) },
      )
      return config
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await kioskConfigRepository.delete(input.id)
      await logAudit(
        { userId: ctx.session.user.id, ipAddress: ctx.ipAddress, userAgent: ctx.deviceName },
        "kiosk.config.delete",
        "kiosk",
        input.id,
      )
    }),
})
