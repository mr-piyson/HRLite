# Attendance Approval + Calendar Plan

## Overview

Two features:
1. **Approval workflow** — review & approve daily attendance, making records uneditable and ready for sending
2. **Calendar view** — separate page at `/attendance/calendar` showing a month grid of attendance data

---

## 1. Prisma Schema Changes

### `Attendance` model — new fields

```
model Attendance {
  // ...existing fields...

  approvalStatus String  @default("pending")  // "pending" | "approved"
  approvedAt     DateTime?
  approvedById   String?

  approvedBy User? @relation(fields: [approvedById], references: [id], onDelete: SetNull)

  @@index([approvalStatus])
}
```

**Migration**: `pnpm prisma migrate dev --name add-attendance-approval`

---

## 2. Backend Changes

### 2a. Domain (`server/domain/attendance.ts`)

- Add `ApprovalStatus` const enum: `Pending = "pending"`, `Approved = "approved"`
- Add `ApprovalStatusLabel` map for display

### 2b. Service (`server/services/attendance.service.ts`)

- `adminUpdateAttendance()` — reject (throw `DomainError("FORBIDDEN")`) if `record.approvalStatus !== "pending"`
- `adminManualCreateAttendance()` — no change (new records always start pending)
- `attendanceRepository.delete()` callers — reject if `record.approvalStatus !== "pending"`

### 2c. tRPC Router (`server/trpc/routers/analytics.ts`)

New endpoints on `attendance` router:

| Endpoint | Input | Description |
|---|---|---|
| `approve` | `{ id: string }` | Approve single record → sets `approvalStatus=approved`, `approvedAt`, `approvedById` |
| `approveBatch` | `{ date: string, employeeIds?: string[] }` | Approve all pending records for a date (or subset by IDs) |
| `revertApproval` | `{ id: string }` | Revert back to `pending` (un-approve) |
| `calendarByMonth` | `{ year: number, month: number }` | Return attendance grouped by date for the month |

### 2d. Calendar Service (`server/services/attendance-calendar.service.ts`) — NEW

```typescript
interface CalendarDay {
  date: string          // "2026-07-15"
  records: {
    employeeId: string
    fullName: string
    empCode: string
    timeIn: Date | null
    timeOut: Date | null
    status: string        // Present, Absent, Late, etc.
    approvalStatus: string
    workingMinutes: number
  }[]
  summary: {
    Present: number
    Absent: number
    Late: number
    HalfDay: number
    Incomplete: number
  }
}

function getCalendarData(year: number, month: number): Promise<CalendarDay[]>
```

- Query all `Attendance` records where `date` starts with `YYYY-MM`
- Group by date
- For each date, include `employee` relation (fullName, empCode)
- Return structured data for calendar rendering

---

## 3. Frontend: Approval UI

### File: `app/(admin)/attendance/page.tsx` (modified)

**Mode toggle** — top of page, next to date picker:
```
[View] [Revise & Approve]
```

**View mode** (default):
- Same as current, plus:
- `approvalStatus` column with badge (pending → amber "Pending", approved → green "Approved")
- Edit/Delete disabled (grayed, `disabled` prop) when `approvalStatus === "approved"`
- Summary cards: add "Pending Approval" and "Approved" counts

**Revise mode** (new):
- Same table but each row has a `<Checkbox>` in the first column
- Approve controls bar above table:
  - "Approve All Pending" button
  - "Approve Selected (N)" button (enabled only when ≥1 row checked)
  - "Select All Pending" checkbox in header
- Clicking "Approve Selected" / "Approve All" → confirmation dialog → calls `approveBatch`
- Approve button disabled if no pending records selected

### File: `components/attendance/attendance-approve-dialog.tsx` (NEW)

Confirmation dialog for batch approval:
- Shows count of records to approve
- "Approve N records?" with Cancel / Approve buttons
- Loading state during mutation
- On success → toast + refetch

---

## 4. Frontend: Calendar View

### File: `app/(admin)/attendance/calendar/page.tsx` (NEW)

### Dependency to install

- `date-fns` — for `startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `format`, etc.

### Layout

```
┌────────────────────────────────────────────┐
│  Attendance Calendar                 [nav] │
│  ← February 2026 →                     [Today] │
│  Sun  Mon  Tue  Wed  Thu  Fri  Sat        │
│  ┌────┬────┬────┬────┬────┬────┬────┐     │
│  │    │    │ 1  │ 2  │ 3  │ 4  │ 5  │     │
│  │    │    │ ●● │ ●  │ ●●●│ ●● │ ●  │     │
│  ├────┼────┼────┼────┼────┼────┼────┤     │
│  │ 6  │ 7  │ 8  │ 9  │ 10 │ 11 │ 12 │     │
│  │ ●● │ ●  │ ●●●│ ●  │ ●● │ ●  │ ●  │     │
│  ├────┼────┼────┼────┼────┼────┼────┤     │
│  │ ...│    │    │    │    │    │    │     │
│  └────┴────┴────┴────┴────┴────┴────┘     │
└────────────────────────────────────────────┘
```

### Day cell design

Each cell shows:
- Top: date number (gray if not current month)
- Below: colored dots/counts per status:
  - Green dot + count for Present
  - Red dot + count for Absent
  - Amber dot + count for Late
  - Orange dot + count for HalfDay
- Approved indicator: small checkmark on the date number if all records are approved
- Clicking a cell → opens `AttendanceCalendarDrawer`

### Day detail drawer

`components/attendance/attendance-calendar-drawer.tsx` — slide-out drawer or dialog:
- Shows date, day name
- List of employees for that day with: name, timeIn→timeOut, status badge, approval badge
- Clicking an employee row → navigates to employee detail or opens edit dialog (if pending)

### tRPC integration

```typescript
// In calendar/page.tsx
const [currentDate, setCurrentDate] = useState(new Date())
const { data } = trpc.attendance.calendarByMonth.useQuery({
  year: currentDate.getFullYear(),
  month: currentDate.getMonth() + 1,
})
```

---

## 5. Component Tree (Summary)

```
app/(admin)/attendance/
├── page.tsx                         ← modified: add revise/approve mode
├── logs/page.tsx                    ← unchanged
└── calendar/page.tsx                ← NEW

components/attendance/
├── attendance-edit-dialog.tsx        ← modified: disable if approved
├── attendance-manual-dialog.tsx      ← unchanged
├── attendance-approve-dialog.tsx     ← NEW
├── attendance-calendar-drawer.tsx    ← NEW
├── attendance-calendar-cell.tsx      ← NEW
├── log-create-dialog.tsx            ← unchanged
└── log-edit-dialog.tsx              ← unchanged
```

---

## 6. Data Flow (Approval)

```
User clicks "Approve Selected"
  → frontend collects checked employee IDs
  → trpc.attendance.approveBatch.mutate({ date, employeeIds })
  → router calls service:
    → attendanceRepository.listPendingForDate(date, employeeIds)
    → for each record:
        attendanceRepository.update(id, {
          approvalStatus: "approved",
          approvedAt: new Date(),
          approvedById: ctx.session.user.id,
        })
    → attendanceLogRepository.create({ logType: "APPROVED", ... })
  → invalidate queries
  → toast success
```

---

## 7. Data Flow (Calendar)

```
Calendar mounts
  → trpc.attendance.calendarByMonth.useQuery({ year, month })
  → router calls service:
    → prisma.attendance.findMany({
        where: { date: { startsWith: "2026-07" } },
        include: { employee: { select: { fullName, empCode } } },
      })
    → group by date
    → compute summary { Present: N, Absent: M, ... }
    → return CalendarDay[]
  → render month grid with colored indicators
```

---

## 8. Implementation Order

1. Install `date-fns`
2. Prisma: add approval fields, run migration
3. Domain: add `ApprovalStatus` enum
4. Repository: add `listPendingForDate` to `attendanceRepository`
5. Service: add approval validation to `adminUpdateAttendance`
6. Router: add `approve`, `approveBatch`, `revertApproval`, `calendarByMonth` endpoints
7. Calendar service: `getCalendarData`
8. Attendance page: add revise/approve mode + approval UI
9. Calendar page: month grid with day cells + drawer
10. Typecheck + build verification

---

## 9. Open Questions

- Should the calendar default to the current month or the date selected on the attendance page?
- Should clicking an employee in the calendar drawer navigate to their detail page?
- For "ready for sending" — should there be a dedicated "Export to Payroll" button that collects approved records?

---

## 10. Visual Design Reference

The calendar is inspired by [lramos33/big-calendar](https://github.com/lramos33/big-calendar) — specifically its month view design:
- Clean grid with soft borders
- Day cells with colored event indicators
- Smooth navigation between months
- Responsive layout
