/**
 * Format KW value for display in quotations
 * Rules:
 * - < 1 kW → show up to 2 decimal places, remove trailing zeros (e.g., 0.75 → "0.75", 0.50 → "0.5")
 * - >= 1 kW → round to whole number (e.g., 3.24 → "3")
 */
export function formatKWForDisplay(kw: number): string {
  if (kw < 1) {
    return kw.toFixed(2).replace(/\.?0+$/, '');
  }
  return Math.floor(kw).toString();
}
