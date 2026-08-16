import ExcelJS from "exceljs"

// ---------------------------------------------------------------------------
// xlsx template builder — mirrors the Haya Manpower timesheet workbook
// (title/legend row, per-day columns, absence/leave fills, formulas).
// ---------------------------------------------------------------------------

export interface DailyBreakdownExportRow {
  sNo: number
  iqamaNo: string
  contactNo: string
  fullName: string
  designation: string
  project: string
  ratePerHour: number
  daily: Record<string, number>
  totalHours: number
  absenceDays: number
  hasAnyHours: boolean
}

export interface DailyBreakdownExport {
  title: string
  from: string
  to: string
  dateColumns: string[]
  employees: DailyBreakdownExportRow[]
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTHS_UPPER = MONTHS.map((m) => m.toUpperCase())

const FILL = {
  absence: "FFFF0000",
  onLeave: "FFFFFF00",
  legendOnLeave: "FFBDD7EE",
  legendReadCaption: "FFCC99FF",
} as const

const THIN_BORDER: ExcelJS.Borders = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
  diagonal: { style: "hair" },
}

/** 1-based column index -> Excel column letter (e.g. 27 -> "AA"). */
function colLetter(n: number): string {
  let s = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function labelDate(d: Date): string {
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`
}

function sheetNameForRange(from: string, to: string): string {
  const f = parseDateKey(from)
  const t = parseDateKey(to)
  const fLabel = `${MONTHS_UPPER[f.getMonth()]}-${String(f.getFullYear()).slice(2)}`
  if (f.getFullYear() === t.getFullYear() && f.getMonth() === t.getMonth()) {
    return fLabel
  }
  const tLabel = `${MONTHS_UPPER[t.getMonth()]}-${String(t.getFullYear()).slice(2)}`
  return `${fLabel} & ${tLabel}`
}

export async function buildDailyBreakdownWorkbook(
  data: DailyBreakdownExport,
): Promise<Buffer> {
  const { from, to, dateColumns, employees } = data

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheetNameForRange(from, to), {
    pageSetup: { orientation: "landscape" },
    views: [{ state: "frozen", ySplit: 2, xSplit: 0, zoomScale: 70 }],
  })

  // --- Column layout ---------------------------------------------------------
  const S_NO = 1
  const IQAMA = 2
  const CONTACT = 3
  const NAME = 4
  const DESIGNATION = 5
  const PROJECT = 6
  const RATE = 7
  const firstDateCol = 8
  const lastDateCol = firstDateCol + dateColumns.length - 1
  const TOTAL_HOURS = lastDateCol + 1
  const TOTAL_ABSENCE = TOTAL_HOURS + 1
  const DEDUCTION = TOTAL_HOURS + 2
  const REMARKS = TOTAL_HOURS + 3
  const CAPTION = TOTAL_HOURS + 4
  const SALARY = TOTAL_HOURS + 5

  // --- Column widths -----------------------------------------------------------
  const widths: [number, number][] = [
    [S_NO, 8.18],
    [IQAMA, 16],
    [CONTACT, 16.27],
    [NAME, 30.45],
    [DESIGNATION, 14.9],
    [PROJECT, 10.27],
    [RATE, 9.18],
    [TOTAL_HOURS, 11.54],
    [TOTAL_ABSENCE, 11.82],
    [DEDUCTION, 14.82],
    [REMARKS, 21],
    [CAPTION, 16.54],
    [SALARY, 14.82],
  ]
  for (const [idx, w] of widths) ws.getColumn(idx).width = w
  for (let c = firstDateCol; c <= lastDateCol; c++) ws.getColumn(c).width = 7.18

  // --- Row 1: title + legend ---------------------------------------------------
  ws.getRow(1).height = 41.5
  const titleCell = ws.getCell(1, S_NO)
  titleCell.value = data.title
  titleCell.font = { name: "Calibri", size: 18, bold: true }
  titleCell.alignment = { horizontal: "center", vertical: "middle" }
  titleCell.border = THIN_BORDER
  ws.mergeCells(1, S_NO, 1, NAME)

  const rangeCell = ws.getCell(1, 5)
  rangeCell.value = `From ${labelDate(parseDateKey(from))} to ${labelDate(parseDateKey(to))}`
  rangeCell.font = { name: "Calibri", size: 16, bold: true }
  rangeCell.alignment = { horizontal: "left", vertical: "middle" }
  rangeCell.border = THIN_BORDER
  ws.mergeCells(1, 5, 1, 9)

  const legend: [number, number, string, string][] = [
    [10, 11, "ABSENCE", FILL.absence],
    [12, 13, "On Leave", FILL.legendOnLeave],
    [14, 15, "Resigned", FILL.onLeave],
    [16, 17, "Read Caption", FILL.legendReadCaption],
  ]
  for (const [start, end, label, fill] of legend) {
    const cell = ws.getCell(1, start)
    cell.value = label
    cell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF000000" } }
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.border = THIN_BORDER
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }
    ws.mergeCells(1, start, 1, end)
  }

  // --- Row 2: column headers ---------------------------------------------------
  ws.getRow(2).height = 90.65
  const headerFont = { name: "Calibri", size: 14, bold: true }
  const headerAlign = { horizontal: "center" as const, vertical: "middle" as const, wrapText: true }

  const staticHeaders: [number, string][] = [
    [S_NO, "S.No."],
    [IQAMA, "Iqama No."],
    [CONTACT, "Contact No."],
    [NAME, "Employee   Name"],
    [DESIGNATION, "Designation"],
    [PROJECT, "Project"],
    [RATE, "Rate per hour (SAR)"],
  ]
  for (const [idx, label] of staticHeaders) {
    const cell = ws.getCell(2, idx)
    cell.value = label
    cell.font = headerFont
    cell.alignment = headerAlign
    cell.border = THIN_BORDER
  }

  for (const key of dateColumns) {
    const d = parseDateKey(key)
    const cell = ws.getCell(2, firstDateCol + dateColumns.indexOf(key))
    cell.value = d
    cell.numFmt = "d-mmm-yy"
    cell.font = { name: "Times New Roman", size: 16, bold: true }
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.border = THIN_BORDER
  }

  const totalsHeaders: [number, string][] = [
    [TOTAL_HOURS, "Total Working  Hours"],
    [TOTAL_ABSENCE, "Total Absence (day)"],
    [DEDUCTION, "Deduction (SAR)"],
    [REMARKS, "Remarks"],
    [CAPTION, "Caption"],
    [SALARY, "Salary (SAR)"],
  ]
  for (const [idx, label] of totalsHeaders) {
    const cell = ws.getCell(2, idx)
    cell.value = label
    cell.font = headerFont
    cell.alignment = headerAlign
    cell.border = THIN_BORDER
  }

  // --- Data rows ---------------------------------------------------------------
  const firstDataRow = 3
  const lastDataRow = firstDataRow + employees.length - 1
  const dateKeyToCol = new Map(dateColumns.map((k, i) => [k, firstDateCol + i]))

  const centerAlign = { horizontal: "center" as const, vertical: "middle" as const }
  const leftAlign = { horizontal: "left" as const, vertical: "middle" as const }
  const dataFont = { name: "Calibri", size: 14 }
  const numFont = { name: "Times New Roman", size: 14, bold: true }

  employees.forEach((emp, i) => {
    const row = firstDataRow + i
    ws.getRow(row).height = 24

    const staticCells: [number, string | number, typeof centerAlign | typeof leftAlign, Partial<ExcelJS.Font>][] = [
      [S_NO, emp.sNo, centerAlign, dataFont],
      [IQAMA, emp.iqamaNo, centerAlign, numFont],
      [CONTACT, emp.contactNo, centerAlign, numFont],
      [NAME, emp.fullName, leftAlign, dataFont],
      [DESIGNATION, emp.designation, leftAlign, dataFont],
      [PROJECT, emp.project, leftAlign, dataFont],
      [RATE, emp.ratePerHour, centerAlign, { name: "Calibri", size: 14, bold: true }],
    ]
    for (const [col, value, align, font] of staticCells) {
      const cell = ws.getCell(row, col)
      cell.value = value
      cell.alignment = align
      cell.font = font
      cell.border = THIN_BORDER
    }

    const rowFill = emp.hasAnyHours ? null : FILL.onLeave
    for (const key of dateColumns) {
      const hours = emp.daily[key] ?? 0
      const col = dateKeyToCol.get(key)!
      const cell = ws.getCell(row, col)
      cell.value = hours
      cell.alignment = centerAlign
      cell.font = numFont
      cell.border = THIN_BORDER
      if (rowFill) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } }
      } else if (hours === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.absence } }
      }
    }

    const totalCell = ws.getCell(row, TOTAL_HOURS)
    totalCell.value = { formula: `SUM(${colLetter(firstDateCol)}${row}:${colLetter(lastDateCol)}${row})` }
    totalCell.alignment = centerAlign
    totalCell.font = numFont
    totalCell.border = THIN_BORDER
    if (rowFill) {
      totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } }
    }

    const absenceCell = ws.getCell(row, TOTAL_ABSENCE)
    absenceCell.value = emp.absenceDays
    absenceCell.alignment = centerAlign
    absenceCell.font = numFont
    absenceCell.border = THIN_BORDER
    if (rowFill) {
      absenceCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } }
    }

    const deductionCell = ws.getCell(row, DEDUCTION)
    deductionCell.value = { formula: `15*${colLetter(TOTAL_ABSENCE)}${row}` }
    deductionCell.alignment = centerAlign
    deductionCell.font = numFont
    deductionCell.border = THIN_BORDER
    if (rowFill) {
      deductionCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } }
    }

    const salaryCell = ws.getCell(row, SALARY)
    salaryCell.value = {
      formula: `${colLetter(RATE)}${row}*${colLetter(TOTAL_HOURS)}${row}-${colLetter(DEDUCTION)}${row}`,
    }
    salaryCell.numFmt = "#,##0.00"
    salaryCell.alignment = centerAlign
    salaryCell.font = numFont
    salaryCell.border = THIN_BORDER
    if (rowFill) {
      salaryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } }
    }
  })

  // --- Totals row ---------------------------------------------------------------
  const totalsRow = lastDataRow + 1
  ws.getRow(totalsRow).height = 30
  const totalsFont = { name: "Calibri", size: 14, bold: true }

  const totalLabel = ws.getCell(totalsRow, NAME)
  totalLabel.value = "Total"
  totalLabel.font = totalsFont
  totalLabel.alignment = leftAlign
  totalLabel.border = THIN_BORDER

  const totals: [number, string][] = [
    [TOTAL_HOURS, `SUM(${colLetter(TOTAL_HOURS)}${firstDataRow}:${colLetter(TOTAL_HOURS)}${lastDataRow})`],
    [TOTAL_ABSENCE, `SUM(${colLetter(TOTAL_ABSENCE)}${firstDataRow}:${colLetter(TOTAL_ABSENCE)}${lastDataRow})`],
    [DEDUCTION, `SUM(${colLetter(DEDUCTION)}${firstDataRow}:${colLetter(DEDUCTION)}${lastDataRow})`],
    [SALARY, `SUM(${colLetter(SALARY)}${firstDataRow}:${colLetter(SALARY)}${lastDataRow})`],
  ]
  for (const [col, formula] of totals) {
    const cell = ws.getCell(totalsRow, col)
    cell.value = { formula }
    if (col === SALARY) cell.numFmt = "#,##0.00"
    cell.font = totalsFont
    cell.alignment = centerAlign
    cell.border = THIN_BORDER
  }

  // --- Final "Total (SAR)" row -------------------------------------------------------
  const finalRow = totalsRow + 2
  ws.getRow(finalRow).height = 34

  const totalSarLabel = ws.getCell(finalRow, CAPTION)
  totalSarLabel.value = "Total (SAR)"
  totalSarLabel.font = totalsFont
  totalSarLabel.alignment = { horizontal: "right", vertical: "middle" }
  totalSarLabel.border = THIN_BORDER

  const totalSar = ws.getCell(finalRow, SALARY)
  totalSar.value = { formula: `${colLetter(SALARY)}${totalsRow}` }
  totalSar.numFmt = "#,##0.00"
  totalSar.font = totalsFont
  totalSar.alignment = centerAlign
  totalSar.border = THIN_BORDER

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
