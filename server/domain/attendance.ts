// ---------------------------------------------------------------------------
// Domain layer
// Pure, framework-agnostic types, enums and value objects. No Prisma, no I/O.
// ---------------------------------------------------------------------------

/** Raw kiosk action types written to the immutable AttendanceLog. */
export const LogType = {
  IN: "IN",
  OUT: "OUT",
  BREAK_IN: "BREAK_IN",
  BREAK_OUT: "BREAK_OUT",
} as const
export type LogType = (typeof LogType)[keyof typeof LogType]

/** Derived daily attendance status. */
export const AttendanceStatus = {
  Present: "Present",
  Absent: "Absent",
  Late: "Late",
  HalfDay: "HalfDay",
  Incomplete: "Incomplete",
  Holiday: "Holiday",
  Weekend: "Weekend",
  Leave: "Leave",
} as const
export type AttendanceStatus =
  (typeof AttendanceStatus)[keyof typeof AttendanceStatus]

/** Human friendly labels for statuses. */
export const AttendanceStatusLabel: Record<AttendanceStatus, string> = {
  Present: "Present",
  Absent: "Absent",
  Late: "Late",
  HalfDay: "Half Day",
  Incomplete: "Incomplete",
  Holiday: "Holiday",
  Weekend: "Weekend",
  Leave: "Leave",
}

/** Identification methods supported by the kiosk (Strategy Pattern keys). */
export const IdentificationMethod = {
  CODE: "CODE",
  QR: "QR",
  BARCODE: "BARCODE",
  RFID: "RFID",
  PIN: "PIN",
} as const
export type IdentificationMethod =
  (typeof IdentificationMethod)[keyof typeof IdentificationMethod]

/**
 * Attendance policy — the configuration-driven inputs that the calculation
 * engine uses. Sourced from KioskConfig so HR can change behaviour without
 * touching code.
 */
export interface AttendancePolicy {
  /** Local workday start time "HH:mm" used to measure lateness. */
  workdayStart: string
  /** Minutes of grace before an arrival counts as Late. */
  lateGraceMinutes: number
  /** Standard minutes in a full working day (overtime measured beyond this). */
  standardWorkMinutes: number
  /** Minimum worked minutes to avoid Half Day classification. */
  halfDayMinutes: number
}

export const DEFAULT_POLICY: AttendancePolicy = {
  workdayStart: "09:00",
  lateGraceMinutes: 15,
  standardWorkMinutes: 480,
  halfDayMinutes: 240,
}

/** Domain error used across the service layer for expected failures. */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "VALIDATION"
      | "CONFLICT"
      | "FORBIDDEN" = "VALIDATION",
  ) {
    super(message)
    this.name = "DomainError"
  }
}
