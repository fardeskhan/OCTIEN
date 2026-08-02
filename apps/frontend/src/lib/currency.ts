/**
 * Shared currency formatting for OCTIEN.
 * Default ERP currency is INR (₹). All dashboard and finance views should format
 * money through these helpers rather than hardcoding a symbol.
 */

export const DEFAULT_CURRENCY = "INR";

const inrFull = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Full grouped INR amount, e.g. ₹12,34,567. Pass `{ decimals: true }` for paise.
 */
export function formatINR(value: number | null | undefined, opts?: { decimals?: boolean }): string {
  const n = Number(value) || 0;
  return (opts?.decimals ? inrPrecise : inrFull).format(n);
}

/**
 * Compact INR using the Indian numbering system (Cr / L / K), e.g. ₹1.2Cr, ₹3.4L.
 * Suited to KPI tiles where space is tight.
 */
export function formatINRCompact(value: number | null | undefined): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(1)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}
