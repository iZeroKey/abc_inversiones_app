export function formatCurrency(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return "S/ 0.00"
  const numericValue = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(numericValue)) return "S/ 0.00"
  
  if (numericValue >= 1000) {
    return `S/ ${(numericValue / 1000).toFixed(1)}K`
  }
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(numericValue)
}

export function formatCurrencyPrecise(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return "0.00"
  const numericValue = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(numericValue)) return "0.00"
  
  return numericValue.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatPercent(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return "0%"
  const numericValue = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(numericValue)) return "0%"
  return `${numericValue.toFixed(1)}%`
}
