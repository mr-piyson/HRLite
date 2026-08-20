import { auditLogRepository } from "@/server/repositories"
import type { Prisma } from "@prisma/client"

export interface AuditContext {
  userId?: string
  ipAddress?: string
  userAgent?: string
}

export function logAudit(
  ctx: AuditContext | null | undefined,
  action: string,
  entity?: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  return auditLogRepository.create({
    userId: ctx?.userId,
    action,
    entity,
    entityId,
    details: details as Prisma.InputJsonValue | undefined,
    ipAddress: ctx?.ipAddress,
    userAgent: ctx?.userAgent,
  })
}
