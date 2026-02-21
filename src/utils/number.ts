/**
 * Parses a decimal string accepting both comma and dot as decimal separator (e.g. "1,5" or "1.5").
 * Returns NaN for invalid or empty input.
 */
export function parseDecimal(value: string | number): number {
  if (value === "" || value == null) return NaN;
  const normalized = String(value).trim().replace(",", ".");
  return parseFloat(normalized);
}
