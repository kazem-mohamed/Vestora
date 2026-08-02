/**
 * Single source for money formatting across the app. Amounts are USD figures
 * stored on the server; the notation is locale-independent on purpose so a
 * number never changes meaning between the English and Arabic views.
 */
const compact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const full = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function compactUsd(value: number): string {
  return compact.format(value ?? 0);
}

export function usd(value: number): string {
  return full.format(value ?? 0);
}
