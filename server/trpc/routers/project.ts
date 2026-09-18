import { z } from "zod"
import { router, adminProcedure, mapDomainError } from "@/server/trpc/trpc"
import {
  projectRepository,
  employeeRepository,
  projectEmployeeRepository,
} from "@/server/repositories"
import { DomainError } from "@/server/domain/attendance"

export const projectRouter = router({
  list: adminProcedure.query(() => projectRepository.list()),

  listActive: adminProcedure.query(() => projectRepository.listActive()),

  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const project = await projectRepository.getById(input.id)
      if (!project) throw new DomainError("Project not found", "NOT_FOUND")
      return project
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await projectRepository.create(input)
      } catch (err) {
        mapDomainError(err)
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const existing = await projectRepository.getById(input.id)
        if (!existing) throw new DomainError("Project not found", "NOT_FOUND")
        return await projectRepository.update(input.id, input.data)
      } catch (err) {
        mapDomainError(err)
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await projectRepository.delete(input.id)
        return { success: true }
      } catch (err) {
        mapDomainError(err)
      }
    }),

  assignEmployee: adminProcedure
    .input(z.object({ employeeId: z.string(), projectId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const employee = await employeeRepository.getById(input.employeeId)
        if (!employee) throw new DomainError("Employee not found", "NOT_FOUND")
        const project = await projectRepository.getById(input.projectId)
        if (!project) throw new DomainError("Project not found", "NOT_FOUND")
        return await projectEmployeeRepository.assign(
          input.employeeId,
          input.projectId,
        )
      } catch (err) {
        mapDomainError(err)
      }
    }),

  unassignEmployee: adminProcedure
    .input(z.object({ employeeId: z.string(), projectId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const employee = await employeeRepository.getById(input.employeeId)
        if (!employee) throw new DomainError("Employee not found", "NOT_FOUND")
        return await projectEmployeeRepository.unassign(
          input.employeeId,
          input.projectId,
        )
      } catch (err) {
        mapDomainError(err)
      }
    }),

  bulkAssign: adminProcedure
    .input(
      z.object({
        employeeIds: z.array(z.string()).min(1),
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const project = await projectRepository.getById(input.projectId)
        if (!project) throw new DomainError("Project not found", "NOT_FOUND")

        await projectEmployeeRepository.bulkAssign(
          input.employeeIds,
          input.projectId,
        )

        return { updated: input.employeeIds.length }
      } catch (err) {
        mapDomainError(err)
      }
    }),

  setActive: adminProcedure
    .input(z.object({ employeeId: z.string(), projectId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const employee = await employeeRepository.getById(input.employeeId)
        if (!employee) throw new DomainError("Employee not found", "NOT_FOUND")
        const project = await projectRepository.getById(input.projectId)
        if (!project) throw new DomainError("Project not found", "NOT_FOUND")
        return await projectEmployeeRepository.activate(
          input.employeeId,
          input.projectId,
        )
      } catch (err) {
        mapDomainError(err)
      }
    }),

  deactivateEmployee: adminProcedure
    .input(z.object({ employeeId: z.string(), projectId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        return await projectEmployeeRepository.deactivate(
          input.employeeId,
          input.projectId,
        )
      } catch (err) {
        mapDomainError(err)
      }
    }),
})
