function escapeCell(str: string): string {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: string[][],
  meta?: Record<string, string>,
) {
  const parts: string[] = []

  if (meta) {
    for (const [key, val] of Object.entries(meta)) {
      parts.push(`${escapeCell(key)},${escapeCell(val)}`)
    }
    parts.push("")
  }

  parts.push(headers.map(escapeCell).join(","))

  for (const r of rows) {
    parts.push(r.map((cell) => escapeCell(String(cell))).join(","))
  }

  const csvContent = parts.join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
