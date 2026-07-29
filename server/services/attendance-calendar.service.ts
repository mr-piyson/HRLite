import { attendanceRepository } from "@/server/repositories"
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns"

export interface CalendarRecord {
  employeeId: string
  fullName: string
  empCode: string
  timeIn: Date | null
  timeOut: Date | null
  status: string
  approvalStatus: string
  workingMinutes: number
  overtimeMinutes: number
  breakMinutes: number
  lateMinutes: number
}

export interface CalendarDay {
  date: string
  records: CalendarRecord[]
  summary: {
    Present: number
    Absent: number
    Late: number
    HalfDay: number
    Incomplete: number
  }
  allApproved: boolean
}

export async function getCalendarData(year: number, month: number): Promise<CalendarDay[]> {
  const records = await attendanceRepository.forMonth(year, month)

  const byDate = new Map<string, CalendarRecord[]>()
  for (const r of records) {
    const day = byDate.get(r.date) ?? []
    day.push({
      employeeId: r.employeeId,
      fullName: r.employee.fullName,
      empCode: r.employee.empCode,
      timeIn: r.timeIn,
      timeOut: r.timeOut,
      status: r.status,
      approvalStatus: r.approvalStatus,
      workingMinutes: r.workingMinutes,
      overtimeMinutes: r.overtimeMinutes,
      breakMinutes: r.breakMinutes,
      lateMinutes: r.lateMinutes,
    })
    byDate.set(r.date, day)
  }

  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(start)
  const days = eachDayOfInterval({ start, end })

  return days.map((d) => {
    const dateKey = format(d, "yyyy-MM-dd")
    const dayRecords = byDate.get(dateKey) ?? []
    const summary = { Present: 0, Absent: 0, Late: 0, HalfDay: 0, Incomplete: 0 }
    for (const r of dayRecords) {
      if (r.status in summary) {
        summary[r.status as keyof typeof summary]++
      }
    }
    const allApproved = dayRecords.length > 0 && dayRecords.every((r) => r.approvalStatus === "approved")

    return { date: dateKey, records: dayRecords, summary, allApproved }
  })
}
