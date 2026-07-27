import { z } from "zod"
import { router, publicProcedure } from "@/server/trpc/trpc"
import { kioskConfigRepository } from "@/server/repositories"

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
  workdayStart: z.string().regex(/^\d{2}:\d{2}$/),
  lateGraceMinutes: z.number().int().min(0).max(240),
  standardWorkMinutes: z.number().int().min(60).max(1440),
  halfDayMinutes: z.number().int().min(30).max(1440),
}

export const settingsRouter = router({
  list: publicProcedure.query(() =>
    kioskConfigRepository.list(),
  ),

  active: publicProcedure.query(() =>
    kioskConfigRepository.getActive(),
  ),

  create: publicProcedure
    .input(z.object(configShape))
    .mutation(({ input }) =>
      kioskConfigRepository.create(input),
    ),

  update: publicProcedure
    .input(z.object({ id: z.string(), data: z.object(configShape).partial() }))
    .mutation(({ input }) =>
      kioskConfigRepository.update(input.id, input.data),
    ),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) =>
      kioskConfigRepository.delete(input.id),
    ),
})
