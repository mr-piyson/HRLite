import { z } from "zod"
import { router, adminProcedure } from "@/server/trpc/trpc"
import { kioskConfigRepository } from "@/server/repositories"
import { regenerateKioskToken, generateKioskToken } from "@/server/services/kiosk.service"

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
    .mutation(async ({ input }) => {
      const token = generateKioskToken()
      return kioskConfigRepository.create({ ...input, accessToken: token })
    }),

  regenerateToken: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const token = await regenerateKioskToken(input.id)
      return { token }
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), data: z.object(configShape).partial() }))
    .mutation(({ input }) =>
      kioskConfigRepository.update(input.id, input.data),
    ),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) =>
      kioskConfigRepository.delete(input.id),
    ),
})
