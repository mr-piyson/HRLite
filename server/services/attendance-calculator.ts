import {
  type AttendancePolicy,
  AttendanceStatus,
  LogType,
} from "@/server/domain/attendance"

export interface RawLog {
  logTime: Date
  logType: string
}

export interface ComputedAttendance {
  date: string
  timeIn: Date | null
  timeOut: Date | null
  workingMinutes: number
  overtimeMinutes: number
  lateMinutes: number
  breakMinutes: number
  status: AttendanceStatus
}

/** yyyy-mm-dd for the day a timestamp belongs to (server local time). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function diffMinutes(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000))
}

/** The scheduled start Date for a given day-key using the policy start time. */
function scheduledStart(dateKey: string, policy: AttendancePolicy): Date {
  const [h, m] = policy.workdayStart.split(":").map((n) => parseInt(n, 10))
  const d = new Date(`${dateKey}T00:00:00`)
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

/** Minimum gap (minutes) between an OUT and subsequent IN to count as break. */
const AUTO_BREAK_THRESHOLD_MINUTES = 45

/**
 * Attendance calculation engine.
 *
 * Pure function: given the immutable logs for a single working day and the
 * active policy, derive the daily attendance record. Contains ALL business
 * rules for hours, overtime, lateness and status classification.
 */
export function computeDailyAttendance(
  dateKey: string,
  logs: RawLog[],
  policy: AttendancePolicy,
): ComputedAttendance {
  const sorted = [...logs].sort(
    (a, b) => a.logTime.getTime() - b.logTime.getTime(),
  )

  const firstIn = sorted.find((l) => l.logType === LogType.IN)?.logTime ?? null
  const lastOut =
    [...sorted].reverse().find((l) => l.logType === LogType.OUT)?.logTime ??
    null

  // Break minutes = paired BREAK_IN -> BREAK_OUT intervals.
  let breakMinutes = 0
  let openBreak: Date | null = null
  for (const l of sorted) {
    if (l.logType === LogType.BREAK_IN) openBreak = l.logTime
    else if (l.logType === LogType.BREAK_OUT && openBreak) {
      breakMinutes += diffMinutes(openBreak, l.logTime)
      openBreak = null
    }
  }

  // Auto-detect unpaid breaks from IN->OUT->IN->OUT sequences.
  // When an OUT is followed by an IN with a gap >= threshold, count it as break.
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i]
    const next = sorted[i + 1]
    if (cur.logType === LogType.OUT && next.logType === LogType.IN) {
      const gap = diffMinutes(cur.logTime, next.logTime)
      if (gap >= AUTO_BREAK_THRESHOLD_MINUTES) {
        breakMinutes += gap
      }
    }
  }

  let workingMinutes = 0
  let overtimeMinutes = 0
  let lateMinutes = 0
  let status: AttendanceStatus = AttendanceStatus.Absent

  if (firstIn && lastOut && lastOut > firstIn) {
    const gross = diffMinutes(firstIn, lastOut)
    workingMinutes = Math.max(0, gross - breakMinutes)
    overtimeMinutes = Math.max(0, workingMinutes - policy.standardWorkMinutes)

    const start = scheduledStart(dateKey, policy)
    const graceLimit = new Date(
      start.getTime() + policy.lateGraceMinutes * 60000,
    )
    if (firstIn > graceLimit) {
      lateMinutes = Math.min(
        diffMinutes(start, firstIn),
        policy.standardWorkMinutes,
      )
    }

    if (workingMinutes < policy.halfDayMinutes) {
      status = AttendanceStatus.HalfDay
    } else if (lateMinutes > 0) {
      status = AttendanceStatus.Late
    } else {
      status = AttendanceStatus.Present
    }
  } else if (firstIn && !lastOut) {
    // Checked in but never checked out.
    status = AttendanceStatus.Incomplete
    const start = scheduledStart(dateKey, policy)
    const graceLimit = new Date(
      start.getTime() + policy.lateGraceMinutes * 60000,
    )
    if (firstIn > graceLimit) {
      lateMinutes = Math.min(
        diffMinutes(start, firstIn),
        policy.standardWorkMinutes,
      )
    }
  }

  return {
    date: dateKey,
    timeIn: firstIn,
    timeOut: lastOut,
    workingMinutes,
    overtimeMinutes,
    lateMinutes,
    breakMinutes,
    status,
  }
}

/** Format minutes as "9h 10m". */
export function formatMinutes(mins: number): string {
  if (!mins || mins <= 0) return "0h 0m"
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}
