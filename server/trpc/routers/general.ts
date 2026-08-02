import { z } from "zod"
import { router, publicProcedure, adminProcedure } from "@/server/trpc/trpc"
import { appSettingRepository } from "@/server/repositories"

export const Weekday = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const
export type Weekday = (typeof Weekday)[number]

const generalSettingsShape = {
  appName: z.string().min(1).max(80),
  appLogo: z
    .string()
    .max(1_200_000)
    .regex(/^data:image\//, "Logo must be an image file")
    .optional()
    .nullable(),
  defaultCurrency: z.string().min(1).max(10),
  defaultWorkdayStart: z.string().regex(/^\d{2}:\d{2}$/),
  weekendDays: z.array(z.enum(Weekday)).min(1).max(7),
  companyName: z.string().max(200).optional().nullable(),
  companyAddress: z.string().max(500).optional().nullable(),
  companyPhone: z.string().max(50).optional().nullable(),
  companyTaxId: z.string().max(100).optional().nullable(),
}

export const generalRouter = router({
  get: publicProcedure.query(() => appSettingRepository.get()),

  update: adminProcedure
    .input(z.object(generalSettingsShape).partial())
    .mutation(({ input }) => appSettingRepository.update(input)),
})
