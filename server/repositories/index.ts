import { prisma } from "@/server/db/prisma"
import type { Prisma } from "@prisma/client"

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
      include: { supplier: true },
      orderBy: { fullName: "asc" },
    })
  },
  getById(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      include: { supplier: true },
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
      include: { employee: true, supplier: true },
      orderBy: { timeIn: "asc" },
    })
  },
  forRange(from: string, to: string) {
    return prisma.attendance.findMany({
      where: { date: { gte: from, lte: to } },
      include: { employee: true, supplier: true },
      orderBy: [{ date: "asc" }, { timeIn: "asc" }],
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

export const kioskConfigRepository = {
  list() {
    return prisma.kioskConfig.findMany({
      orderBy: { createdAt: "asc" },
    })
  },
  getActive() {
    return prisma.kioskConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    })
  },
  getById(id: string) {
    return prisma.kioskConfig.findUnique({ where: { id } })
  },
  getBySlug(slug: string) {
    return prisma.kioskConfig.findUnique({ where: { slug } })
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
