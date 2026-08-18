export function formatRps(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return Math.round(value).toLocaleString();
}

export function formatMs(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value < 10) return `${value.toFixed(1)}ms`;
  return `${Math.round(value)}ms`;
}

export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function formatGb(value: number): string {
  if (value >= 1024) return `${(value / 1024).toFixed(1)} TB`;
  return `${Math.round(value)} GB`;
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
