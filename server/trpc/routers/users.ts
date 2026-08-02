import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, adminProcedure } from "@/server/trpc/trpc"
import { auth } from "@/lib/auth"

const roleSchema = z.enum(["admin", "user"])

function mapAuthError(err: unknown): never {
  if (err instanceof TRPCError) throw err
  const e = err as { status?: number; message?: string }
  const status = e?.status ?? 500
  const code =
    status >= 500
      ? ("INTERNAL_SERVER_ERROR" as const)
      : status === 401 || status === 403
        ? ("FORBIDDEN" as const)
        : status === 409
          ? ("CONFLICT" as const)
          : ("BAD_REQUEST" as const)
  throw new TRPCError({
    code,
    message: e?.message || "Request failed",
    cause: err,
  })
}

export const userRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    try {
      return await auth.api.listUsers({
        headers: ctx.headers ?? new Headers(),
        query: { limit: 100 },
      })
    } catch (err) {
      mapAuthError(err)
    }
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        role: roleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await auth.api.createUser({
          headers: ctx.headers ?? new Headers(),
          body: {
            name: input.name,
            email: input.email,
            password: input.password,
            role: input.role,
          },
        })
      } catch (err) {
        mapAuthError(err)
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        data: z
          .object({
            name: z.string().min(1).optional(),
            email: z.string().email().optional(),
          })
          .refine((d) => d.name !== undefined || d.email !== undefined, {
            message: "Provide at least one field to update",
          }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await auth.api.adminUpdateUser({
          headers: ctx.headers ?? new Headers(),
          body: {
            userId: input.userId,
            data: input.data,
          },
        })
      } catch (err) {
        mapAuthError(err)
      }
    }),

  setRole: adminProcedure
    .input(z.object({ userId: z.string(), role: roleSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await auth.api.setRole({
          headers: ctx.headers ?? new Headers(),
          body: { userId: input.userId, role: input.role },
        })
      } catch (err) {
        mapAuthError(err)
      }
    }),

  setPassword: adminProcedure
    .input(z.object({ userId: z.string(), newPassword: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await auth.api.setUserPassword({
          headers: ctx.headers ?? new Headers(),
          body: { userId: input.userId, newPassword: input.newPassword },
        })
      } catch (err) {
        mapAuthError(err)
      }
    }),

  ban: adminProcedure
    .input(z.object({ userId: z.string(), banReason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await auth.api.banUser({
          headers: ctx.headers ?? new Headers(),
          body: { userId: input.userId, banReason: input.banReason },
        })
      } catch (err) {
        mapAuthError(err)
      }
    }),

  unban: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await auth.api.unbanUser({
          headers: ctx.headers ?? new Headers(),
          body: { userId: input.userId },
        })
      } catch (err) {
        mapAuthError(err)
      }
    }),

  remove: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await auth.api.removeUser({
          headers: ctx.headers ?? new Headers(),
          body: { userId: input.userId },
        })
      } catch (err) {
        mapAuthError(err)
      }
    }),

  revokeSessions: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await auth.api.revokeUserSessions({
          headers: ctx.headers ?? new Headers(),
          body: { userId: input.userId },
        })
      } catch (err) {
        mapAuthError(err)
      }
    }),
})
