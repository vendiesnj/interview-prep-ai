export function asOverall100(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value <= 10 ? value * 10 : value;
}

export function asTenPoint(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value > 10 ? value / 10 : value;
}

export function displayOverall100(value: number | null | undefined): string {
  const normalized = asOverall100(value);
  return normalized === null ? " - " : `${Math.round(normalized)}/100`;
}

export function displayTenPointAs100(value: number | null | undefined): string {
  const normalized = asTenPoint(value);
  return normalized === null ? " - " : `${Math.round(normalized * 10)}/100`;
}

export function avgOverall100(values: Array<number | null | undefined>): number | null {
  const normalized = values
    .map(asOverall100)
    .filter((v): v is number => v !== null);

  if (!normalized.length) return null;
  return normalized.reduce((a, b) => a + b, 0) / normalized.length;
}

export function avgTenPoint(values: Array<number | null | undefined>): number | null {
  const normalized = values
    .map(asTenPoint)
    .filter((v): v is number => v !== null);

  if (!normalized.length) return null;
  return normalized.reduce((a, b) => a + b, 0) / normalized.length;
}