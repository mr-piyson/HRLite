export function downloadCSV(
  filename: string,
  headers: string[],
  rows: string[][],
  meta?: Record<string, string>,
) {
  const parts: string[] = []

  if (meta) {
    for (const [key, val] of Object.entries(meta)) {
      const escaped = val.includes(",") ? `"${val}"` : val
      parts.push(`${key},${escaped}`)
    }
    parts.push("")
  }

  parts.push(headers.join(","))

  for (const r of rows) {
    parts.push(
      r
        .map((cell) => {
          const str = String(cell)
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        .join(","),
    )
  }

  const csvContent = parts.join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
