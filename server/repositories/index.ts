import { prisma } from "@/server/db/prisma"
import type { Prisma } from "@prisma/client"

export const projectEmployeeRepository = {
  listForEmployee(employeeId: string) {
    return prisma.projectEmployee.findMany({
      where: { employeeId },
      include: { project: true },
      orderBy: { activatedAt: "desc" },
    })
  },
  listForProject(projectId: string) {
    return prisma.projectEmployee.findMany({
      where: { projectId },
      include: {
        employee: {
          include: { supplier: true },
        },
      },
      orderBy: { employee: { fullName: "asc" } },
    })
  },
  getActiveForEmployee(employeeId: string) {
    return prisma.projectEmployee.findFirst({
      where: { employeeId, isActive: true },
      include: { project: true },
    })
  },
  getActiveForProject(projectId: string) {
    return prisma.projectEmployee.findMany({
      where: { projectId, isActive: true },
      include: {
        employee: {
          include: { supplier: true },
        },
      },
      orderBy: { employee: { fullName: "asc" } },
    })
  },
  async activate(employeeId: string, projectId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.projectEmployee.updateMany({
        where: { employeeId, isActive: true },
        data: { isActive: false },
      })
      const existing = await tx.projectEmployee.findUnique({
        where: { employeeId_projectId: { employeeId, projectId } },
      })
      if (existing) {
        return tx.projectEmployee.update({
          where: { id: existing.id },
          data: { isActive: true, activatedAt: new Date() },
        })
      }
      return tx.projectEmployee.create({
        data: { employeeId, projectId, isActive: true },
      })
    })
  },
  deactivate(employeeId: string, projectId: string) {
    return prisma.projectEmployee.updateMany({
      where: { employeeId, projectId },
      data: { isActive: false },
    })
  },
  assign(employeeId: string, projectId: string) {
    return prisma.projectEmployee.upsert({
      where: { employeeId_projectId: { employeeId, projectId } },
      create: { employeeId, projectId, isActive: true },
      update: { isActive: true, activatedAt: new Date() },
    })
  },
  unassign(employeeId: string, projectId: string) {
    return prisma.projectEmployee.deleteMany({
      where: { employeeId, projectId },
    })
  },
  bulkAssign(employeeIds: string[], projectId: string) {
    return prisma.$transaction(async (tx) => {
      for (const employeeId of employeeIds) {
        await tx.projectEmployee.upsert({
          where: { employeeId_projectId: { employeeId, projectId } },
          create: { employeeId, projectId, isActive: true },
          update: { isActive: true, activatedAt: new Date() },
        })
      }
    })
  },
  countForProject(projectId: string) {
    return prisma.projectEmployee.count({ where: { projectId } })
  },
}

export const projectRepository = {
  list() {
    return prisma.project.findMany({
      include: { _count: { select: { projectEmployees: true } } },
      orderBy: { name: "asc" },
    })
  },
  listActive() {
    return prisma.project.findMany({
      where: { isActive: true },
      include: { _count: { select: { projectEmployees: true } } },
      orderBy: { name: "asc" },
    })
  },
  getById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        projectEmployees: {
          include: {
            employee: {
              include: { supplier: true },
            },
          },
          orderBy: { employee: { fullName: "asc" } },
        },
        _count: { select: { projectEmployees: true } },
      },
    })
  },
  create(data: Prisma.ProjectUncheckedCreateInput) {
    return prisma.project.create({ data })
  },
  update(id: string, data: Prisma.ProjectUncheckedUpdateInput) {
    return prisma.project.update({ where: { id }, data })
  },
  async delete(id: string) {
    const count = await prisma.projectEmployee.count({ where: { projectId: id } })
    if (count > 0) {
      throw new Error("Cannot delete project with assigned employees")
    }
    return prisma.project.delete({ where: { id } })
  },
}

export const supplierRepository = {
  list() {
    return prisma.supplier.findMany({
      orderBy: { supplierName: "asc" },
    })
  },
  listActive() {
    return prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { supplierName: "asc" },
    })
  },
  getById(id: string) {
    return prisma.supplier.findUnique({ where: { id } })
  },
  create(data: Prisma.SupplierUncheckedCreateInput) {
    return prisma.supplier.create({ data })
  },
  update(id: string, data: Prisma.SupplierUncheckedUpdateInput) {
    return prisma.supplier.update({ where: { id }, data })
  },
}

export const employeeRepository = {
  list() {
    return prisma.employee.findMany({
      include: {
        supplier: true,
        projectEmployees: {
          include: { project: true },
        },
      },
      orderBy: { fullName: "asc" },
    })
  },
  listActive() {
    return prisma.employee.findMany({
      where: { isActive: true },
      include: {
        projectEmployees: {
          include: { project: true },
        },
      },
      orderBy: { fullName: "asc" },
    })
  },
  listByProject(projectId: string) {
    return prisma.employee.findMany({
      where: {
        isActive: true,
        projectEmployees: {
          some: { projectId, isActive: true },
        },
      },
      include: {
        projectEmployees: { include: { project: true } },
      },
      orderBy: { fullName: "asc" },
    })
  },
  listUnassigned() {
    return prisma.employee.findMany({
      where: {
        isActive: true,
        projectEmployees: { none: { isActive: true } },
      },
      orderBy: { fullName: "asc" },
    })
  },
  getById(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      include: {
        supplier: true,
        projectEmployees: { include: { project: true } },
      },
    })
  },
  getByCode(empCode: string) {
    return prisma.employee.findFirst({
      where: { empCode, isActive: true },
      include: { supplier: true },
    })
  },
  getByRfid(rfid: string) {
    return prisma.employee.findFirst({
      where: { rfid, isActive: true },
      include: { supplier: true },
    })
  },
  create(data: Prisma.EmployeeUncheckedCreateInput) {
    return prisma.employee.create({ data })
  },
  update(id: string, data: Prisma.EmployeeUncheckedUpdateInput) {
    return prisma.employee.update({ where: { id }, data })
  },
}

export const rateHistoryRepository = {
  create(data: Prisma.EmployeeRateHistoryUncheckedCreateInput) {
    return prisma.employeeRateHistory.create({ data })
  },
  listForEmployee(employeeId: string) {
    return prisma.employeeRateHistory.findMany({
      where: { employeeId },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
    })
  },
  listForEmployees(employeeIds: string[]) {
    return prisma.employeeRateHistory.findMany({
      where: { employeeId: { in: employeeIds } },
      orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
    })
  },
}

export const attendanceLogRepository = {
  create(data: Prisma.AttendanceLogUncheckedCreateInput) {
    return prisma.attendanceLog.create({ data })
  },
  forEmployeeInRange(employeeId: string, start: Date, end: Date) {
    return prisma.attendanceLog.findMany({
      where: { employeeId, logTime: { gte: start, lt: end } },
      orderBy: { logTime: "asc" },
    })
  },
  recent(take = 20) {
    return prisma.attendanceLog.findMany({
      include: { employee: true },
      orderBy: { logTime: "desc" },
      take,
    })
  },
  countSince(employeeId: string, since: Date) {
    return prisma.attendanceLog.count({
      where: { employeeId, logTime: { gte: since } },
    })
  },
  findLastInRange(employeeId: string, start: Date, end: Date) {
    return prisma.attendanceLog.findFirst({
      where: { employeeId, logTime: { gte: start, lt: end } },
      orderBy: { logTime: "desc" },
      select: { logType: true },
    })
  },
  findLastSince(employeeId: string, since: Date) {
    return prisma.attendanceLog.findFirst({
      where: { employeeId, logTime: { gte: since } },
      orderBy: { logTime: "desc" },
      select: { logType: true },
    })
  },
  getById(id: string) {
    return prisma.attendanceLog.findUnique({ where: { id } })
  },
  update(id: string, data: Prisma.AttendanceLogUncheckedUpdateInput) {
    return prisma.attendanceLog.update({ where: { id }, data })
  },
  delete(id: string) {
    return prisma.attendanceLog.delete({ where: { id } })
  },
}

export const attendanceRepository = {
  upsertDaily(
    employeeId: string,
    date: string,
    data: Prisma.AttendanceUncheckedCreateInput,
  ) {
    return prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: data,
      update: {
        projectId: data.projectId,
        supplierId: data.supplierId,
        timeIn: data.timeIn,
        timeOut: data.timeOut,
        workingMinutes: data.workingMinutes,
        overtimeMinutes: data.overtimeMinutes,
        lateMinutes: data.lateMinutes,
        breakMinutes: data.breakMinutes,
        status: data.status,
        createdFromLog: data.createdFromLog,
      },
    })
  },
  forDate(date: string) {
    return prisma.attendance.findMany({
      where: { date },
      include: { employee: true, supplier: true, approvedBy: { select: { id: true, name: true } } },
      orderBy: { timeIn: "asc" },
    })
  },
  forRange(from: string, to: string) {
    return prisma.attendance.findMany({
      where: { date: { gte: from, lte: to } },
      include: { employee: true, supplier: true, approvedBy: { select: { id: true, name: true } } },
      orderBy: [{ date: "asc" }, { timeIn: "asc" }],
    })
  },
  forMonth(year: number, month: number) {
    const prefix = `${year}-${String(month).padStart(2, "0")}`
    return prisma.attendance.findMany({
      where: { date: { startsWith: prefix } },
      include: {
        employee: { select: { id: true, fullName: true, empCode: true } },
      },
      orderBy: [{ date: "asc" }, { timeIn: "asc" }],
    })
  },
  listPendingForDate(date: string, employeeIds?: string[]) {
    return prisma.attendance.findMany({
      where: {
        date,
        approvalStatus: "pending",
        ...(employeeIds ? { employeeId: { in: employeeIds } } : {}),
      },
    })
  },
  getDaily(employeeId: string, date: string) {
    return prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date } },
    })
  },
  getById(id: string) {
    return prisma.attendance.findUnique({ where: { id } })
  },
  update(id: string, data: Prisma.AttendanceUncheckedUpdateInput) {
    return prisma.attendance.update({ where: { id }, data })
  },
  create(data: Prisma.AttendanceUncheckedCreateInput) {
    return prisma.attendance.create({ data })
  },
  delete(id: string) {
    return prisma.attendance.delete({ where: { id } })
  },
}

export const appSettingRepository = {
  get() {
    return prisma.appSetting.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    })
  },
  update(data: Prisma.AppSettingUncheckedUpdateInput) {
    return prisma.appSetting.upsert({
      where: { id: "default" },
      create: { id: "default", ...(data as Prisma.AppSettingUncheckedCreateInput) },
      update: data,
    })
  },
}

export const auditLogRepository = {
  create(data: Prisma.AuditLogUncheckedCreateInput) {
    return prisma.auditLog.create({ data })
  },
  list(options?: { userId?: string; action?: string; entity?: string; from?: Date; to?: Date; take?: number }) {
    return prisma.auditLog.findMany({
      where: {
        ...(options?.userId && { userId: options.userId }),
        ...(options?.action && { action: options.action }),
        ...(options?.entity && { entity: options.entity }),
        ...(options?.from && { createdAt: { gte: options.from } }),
        ...(options?.to && { createdAt: { lte: options.to } }),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: options?.take ?? 50,
    })
  },
}

export const kioskConfigRepository = {
  list() {
    return prisma.kioskConfig.findMany({
      include: { project: true },
      orderBy: { createdAt: "asc" },
    })
  },
  getActive() {
    return prisma.kioskConfig.findFirst({
      where: { isActive: true },
      include: { project: true },
      orderBy: { createdAt: "asc" },
    })
  },
  getById(id: string) {
    return prisma.kioskConfig.findUnique({
      where: { id },
      include: { project: true },
    })
  },
  getBySlug(slug: string) {
    return prisma.kioskConfig.findUnique({
      where: { slug },
      include: { project: true },
    })
  },
  getByToken(token: string) {
    return prisma.kioskConfig.findFirst({
      where: { accessToken: token, isActive: true },
      include: { project: true },
    })
  },
  updateToken(id: string, token: string) {
    return prisma.kioskConfig.update({
      where: { id },
      data: { accessToken: token },
    })
  },
  create(data: Prisma.KioskConfigUncheckedCreateInput) {
    return prisma.kioskConfig.create({ data })
  },
  update(id: string, data: Prisma.KioskConfigUncheckedUpdateInput) {
    return prisma.kioskConfig.update({ where: { id }, data })
  },
  delete(id: string) {
    return prisma.kioskConfig.delete({ where: { id } })
  },
}
