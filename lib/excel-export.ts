export interface ExcelColumn {
  header: string
  key: string
  width?: number
}

export interface ExcelExportOptions {
  filename: string
  sheetName: string
  columns: ExcelColumn[]
  data: any[]
}

/**
 * Export data to Excel format (.xlsx)
 * Uses CSV format with proper encoding for Excel compatibility
 */
export function exportToExcel({ filename, sheetName, columns, data }: ExcelExportOptions): void {
  if (data.length === 0) {
    throw new Error("Nenhum dado para exportar")
  }

  // Create CSV content with headers
  const headers = columns.map((col) => col.header)
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key]
      // Handle different data types
      if (value === null || value === undefined) return ""
      if (typeof value === "string") {
        // Escape quotes and wrap in quotes if contains comma or newline
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }
      if (typeof value === "number") return value.toString()
      if (typeof value === "boolean") return value ? "Sim" : "Não"
      if (value instanceof Date) return value.toLocaleDateString("pt-BR")
      return String(value)
    }),
  )

  // Combine headers and rows
  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

  // Add UTF-8 BOM for proper Excel encoding
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })

  // Create download link
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export multiple sheets to separate Excel files
 */
export function exportMultipleSheets(exports: ExcelExportOptions[]): void {
  exports.forEach((exportOptions) => {
    exportToExcel(exportOptions)
  })
}
