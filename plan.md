# Plan: Export Daily Breakdown to Excel (Haya Manpower Template)

## Goal

Replace/augment the current CSV-only "Export Daily Breakdown" button in
`ReportsPage` with a real `.xlsx` export that visually matches the reference
workbook `Haya_Manpower_..._Timesheet_&_Salary.xlsx` (title bar, colored
absence/leave flags, per-day columns, totals, deduction footer).

Stack: Next.js 16 App Router, tRPC, existing `trpc.report.dailyBreakdown`
query. Runtime is `opencode` (agentic coding CLI), so steps are written to be
executed incrementally and verified after each one.

---

## 0. Reference template — what we're matching

Inspected `JAN & FEB-26` sheet of the uploaded workbook. Structure to replicate:

**Row 1 (title/legend, height ~41.5, merged cells):**

- `A1:D1` merged — `"Haya Manpower Supplier - Riyadh"` (bold 18pt, centered)
- `E1:I1` merged — `"From 1-Jan-2026 to 31-Jan-2026"` (bold 16pt, left aligned)
- `J1:K1` merged — `"ABSENCE"` — fill `FFFF0000` (red)
- `L1:M1` merged — `"On Leave"` — fill theme color 5, tint 0.8 (light blue)
- `N1:O1` merged — `"Resigned"` — fill `FFFFFF00` (yellow)
- `P1:Q1` merged — `"Read Caption"` — fill `FFCC99FF` (purple)

**Row 2 (column headers, height ~90.65, bold 14pt Calibri, wrap text, centered, thin border):**
`S.No.` | `Iqama No.` | `Contact No.` | `Employee Name` | `Designation` |
`Project` | `Rate per hour (SAR)` | `<date>` × N columns (bold 16pt Times New
Roman, format `d-mmm-yy`) | `Total Working Hours` | `Total Absence (day)` |
`Deduction (SAR)` | `Remarks` | `Caption` | `Salary (SAR)`

**Data rows (row height 24, thin border all sides):**

- Static columns: S.No (int), Iqama No., Contact No., Name (left aligned),
  Designation, Project, Rate/hr — plain values, no formulas.
- One column per calendar day in range → hours worked that day (int).
  - Cell fill **red** (`FFFF0000`) when that single day = 0 but the employee
    otherwise has hours that period (flags an unexplained absence).
  - **Entire row** filled **yellow** (`FFFFFF00`) when the employee has 0
    hours across the whole period (on leave / resigned for that stretch).
  - Normal worked days: no fill.
- `Total Working Hours` = `=SUM(<first day col><row>:<last day col><row>)`
- `Total Absence (day)` = count of red-flagged days (manually entered int in
  source, not a formula — we'll compute it directly)
- `Deduction (SAR)` = `=15*<Total Absence cell>`
- `Salary (SAR)` = `=<Rate cell>*<Total Working Hours cell>-<Deduction cell>`
  (formatted `#,##0.00`)
- `Remarks` / `Caption` — free text, left blank unless we have the data.

**Footer block (after last employee row):**

- Totals row: `=SUM(...)` for Total Working Hours, Total Absence, Deduction,
  Salary columns across all employee rows.
- "Deduction" notes section (merged rows) — free-text agreed deduction notes
  per month, each with its own SAR amount.
- Final `Total (SAR)` = totals row salary + deduction notes total.

Sheet-level: landscape orientation, zoom 70%, column A width ~8.2, D width
~30.5 (name), G ~9.2 (rate), AQ–AV ~11–21 (totals block).

---

## 1. Open questions to confirm before building (data gaps)

The current `dailyBreakdown` tRPC response (per `ReportsPage.tsx`) only
exposes: `employeeId, fullName, empCode, supplierName, daily: Record<date,
minutes>, totalWorkingMinutes, absenceDays`, plus `dateColumns: string[]`.

The template needs fields **not currently in that payload**:

- Iqama No. / Contact No.
- Designation, Project
- Rate per hour (SAR)
- Deduction rule / amount, Remarks, Caption, Salary
- Distinction between "absence" (red single-day) vs "on leave" (yellow
  whole-row) vs "resigned"

**Decision needed from you:** do these fields already exist on the
`Employee` model / elsewhere in the schema (just not returned by this
endpoint), or do we need new columns + a migration? This plan assumes they
exist on the employee record and just need to be joined in; adjust Step 3 if
a migration is required.

---

## 2. Dependencies

Use **ExcelJS** (not SheetJS/xlsx) — it's the one that supports cell fills,
merges, fonts, formulas, number formats, and freeze panes, which SheetJS's
community build does not do well.

Generate the file **server-side** (inside the tRPC procedure), not in the
browser:

- Keeps styling logic in one place (reusable for future "By Employee" /
  "By Supplier" xlsx exports).
- Avoids shipping ExcelJS (~1MB) to the client bundle.
- Matches the existing pattern where `report.dailyBreakdown` already does
  all aggregation server-side.

```bash
npm install exceljs
npm install -D @types/exceljs   # if not bundled
```

---

## 3. Server: extend the data layer

**File:** `src/server/services/attendance-calculator.ts` (or wherever
`dailyBreakdown` currently lives)

- Extend the `dailyBreakdown` resolver (or add a new
  `dailyBreakdownForExport` resolver) to also select/join:
  `iqamaNo, contactNo, designation, project, ratePerHour` from the employee
  record.
- Compute, per employee per day, a `status: "worked" | "absent" | "onLeave"`
  instead of just a raw minute count, so the export step doesn't need to
  re-derive fill colors from ambiguous zeros. Suggested rule (confirm with
  you):
  - `onLeave` (whole row yellow) — employee has an active leave record
    covering the full range, or 100% zero days AND a `leaveStatus` flag.
  - `absent` (single cell red) — scheduled but 0 recorded minutes and no
    leave record for that date.
  - `worked` — minutes > 0.

If leave/resigned tracking doesn't exist yet, fallback heuristic: whole-row
yellow if `totalWorkingMinutes === 0` for the whole range, otherwise
per-day red on any 0-minute day — matches what's visible in the sample file
today.

---

## 4. Server: new tRPC procedure

**File:** `src/server/api/routers/report.ts`

```ts
exportDailyBreakdownXlsx: protectedProcedure
  .input(z.object({ from: z.string(), to: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const data = await getDailyBreakdownForExport(ctx, input); // step 3 output
    const buffer = await buildDailyBreakdownWorkbook(data, input); // step 5
    return {
      filename: `Daily_Breakdown_${input.from}_${input.to}.xlsx`,
      // base64 so it travels cleanly over the tRPC/JSON transport
      base64: buffer.toString("base64"),
    };
  }),
```

Notes:

- Use `.mutation` not `.query` — it's a one-shot generation action, and it
  avoids react-query caching a binary blob.
- Return base64 string (tRPC's default JSON transformer can't carry a raw
  `Buffer`/`ArrayBuffer` cleanly unless `superjson` is configured for
  binary — base64 sidesteps that entirely).
- If exports get large (many months / many employees), consider streaming
  via a plain Next.js Route Handler (`/api/export/daily-breakdown`) instead
  of tRPC, to avoid base64 bloat and payload size limits. Start with tRPC
  for simplicity; revisit if files exceed a few MB.

---

## 5. Server: workbook builder (the template itself)

**File:** `src/server/services/xlsx/daily-breakdown-template.ts`

```ts
import ExcelJS from "exceljs";

const FILL = {
  absence: "FFFF0000",
  onLeave: "FFFFFF00", // or a distinct color from "resigned" if both exist — confirm
  resigned: "FFFFFF00",
  legendReadCaption: "FFCC99FF",
};

export async function buildDailyBreakdownWorkbook(data, range) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetNameForRange(range), {
    pageSetup: { orientation: "landscape" },
    views: [{ zoomScale: 70 }],
  });

  // Row 1: title + legend (merged cells, fills, fonts) — mirrors A1/E1/J1/L1/N1/P1
  // Row 2: column headers incl. one per date in dateColumns, format 'd-mmm-yy'
  // Data rows: one per employee, static cols + per-day cols + formulas
  // Totals row: =SUM() over the data row range
  // Footer: deduction notes + grand total

  // Column widths / row heights matched to source (Step 0 measurements)

  return wb.xlsx.writeBuffer();
}
```

Key implementation details:

- **Formulas, not baked-in numbers**, for `Total Working Hours`, `Deduction`,
  `Salary`, and the footer `SUM()` rows — so the exported file stays
  editable/auditable like the source, e.g.
  `ws.getCell(row, totalCol).value = { formula: \`SUM(${startCol}${r}:${endCol}${r})\` }`.
- Apply `cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.absence } }`
  per-day-cell for absence, and loop the whole row for on-leave/resigned.
- Reuse one `border`/`font` style object per column type instead of
  constructing new objects per cell (perf, and keeps styling consistent).
- Merge cells for the row-1 title/legend and the deduction-notes block with
  `ws.mergeCells(...)`.
- Freeze header rows with `ws.views = [{ state: "frozen", ySplit: 2 }]` (the
  source file didn't freeze panes, but it's a small usability win — flag as
  optional, drop if you want an exact visual match).

---

## 6. Client: wire up the download

**File:** `src/app/.../reports-page.tsx` (component pasted above)

Replace `handleExportDailyBreakdown`'s CSV call with a call to the new
mutation, decode base64 → Blob, and reuse the same download-trigger pattern
already used by `downloadCSV`:

```ts
const exportXlsx = trpc.report.exportDailyBreakdownXlsx.useMutation();

const handleExportDailyBreakdown = async () => {
  if (!dailyData) return;
  const { filename, base64 } = await exportXlsx.mutateAsync({ from, to });
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
```

- Update the button label from "Export Daily Breakdown" (CSV icon) to reflect
  `.xlsx` — swap `Download` icon for `FileSpreadsheet` for visual consistency
  with the existing "Export All Suppliers" button.
- Add a loading state (`exportXlsx.isPending`) to disable the button while
  the workbook is being built server-side, since generation is no longer
  instant like the client-side CSV path.
- Decide whether to **keep** the CSV export as a secondary option (e.g. a
  small dropdown: "Export as CSV" / "Export as Excel") or fully replace it.
  Recommend keeping both — CSV stays useful for quick data dumps into other
  tools; Excel is for the polished, printable/payroll-ready version.

---

## 7. Testing

1. Unit test the workbook builder in isolation: feed it a small fixture
   (2–3 employees, 5 days, one absence day, one all-zero employee) and assert
   on cell values/fills/formulas via ExcelJS's reader API, not just "it
   doesn't throw."
2. Manual QA: generate a real export for a known date range, open in Excel/
   LibreOffide, and diff visually against the reference workbook — check
   column widths, legend colors, date format, and that formulas recalculate
   correctly when a source cell is edited.
3. Edge cases to explicitly test:
   - Date range spanning a month boundary (like the source's Jan+Feb sheet)
     — column count grows, make sure header row and merges don't break.
   - Employee with zero days in range (full yellow row) — formulas (`SUM`
     over all-zero range) shouldn't error.
   - Very large employee count — confirm generation time and base64 payload
     size stay reasonable; if not, move to the streaming Route Handler
     approach noted in Step 4.

---

## 8. Rollout order

1. Confirm data-gap questions (Step 1) with you.
2. Install ExcelJS, build `buildDailyBreakdownWorkbook` against a **static
   fixture** first (no DB), diff against reference file.
3. Wire the tRPC procedure once the builder is verified.
4. Wire the client button + loading state.
5. QA pass (Step 7), then remove/relabel the old CSV button per your call
   in Step 6.
