import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { ZodError } from "zod"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { DomainError } from "@/server/domain/attendance"
import { auth } from "@/lib/auth"

export interface Context {
  ipAddress?: string
  deviceName?: string
  session?: {
    user: {
      id: string
      email: string
      name: string
      role?: string | null
    }
  } | null
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

  let session: Context["session"] = null
  if (headers) {
    try {
      const result = await auth.api.getSession({ headers })
      session = result
    } catch {
      // Not authenticated — session stays null
    }
  }

  return { ipAddress, deviceName, session }
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

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource",
    })
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  })
})

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to access this resource",
    })
  }
  return next({ ctx })
})

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
  if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
    const target = (err.meta?.target as string[])?.join(", ") ?? "field"
    throw new TRPCError({
      code: "CONFLICT",
      message: `A record with this ${target} already exists`,
      cause: err,
    })
  }
  throw err
}
