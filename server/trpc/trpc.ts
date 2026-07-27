import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { ZodError } from "zod"
import { DomainError } from "@/server/domain/attendance"

export interface Context {
  ipAddress?: string
  deviceName?: string
}

export async function createContext(opts?: {
  headers?: Headers
}): Promise<Context> {
  const headers = opts?.headers
  const ipAddress =
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers?.get("x-real-ip") ??
    undefined
  const deviceName = headers?.get("user-agent") ?? undefined
  return { ipAddress, deviceName }
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
        domainCode:
          error.cause instanceof DomainError ? error.cause.code : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

export function mapDomainError(err: unknown): never {
  if (err instanceof DomainError) {
    const map = {
      NOT_FOUND: "NOT_FOUND",
      VALIDATION: "BAD_REQUEST",
      CONFLICT: "CONFLICT",
      FORBIDDEN: "FORBIDDEN",
    } as const
    throw new TRPCError({ code: map[err.code], message: err.message, cause: err })
  }
  throw err
}
