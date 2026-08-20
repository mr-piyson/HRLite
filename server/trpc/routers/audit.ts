import { z } from "zod"
import { router, adminProcedure } from "@/server/trpc/trpc"
import { auditLogRepository } from "@/server/repositories"

export const auditLogRouter = router({
  list: adminProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        action: z.string().optional(),
        entity: z.string().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        take: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(({ input }) => auditLogRepository.list(input)),
})
