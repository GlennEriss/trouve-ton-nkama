function escapeCsvCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  const escaped = text.replaceAll('"', '""');
  return `"${escaped}"`;
}

export function toCsvLine(values: unknown[]) {
  return `${values.map((value) => escapeCsvCell(value)).join(",")}\n`;
}

export function csvFilename(prefix: string) {
  const now = new Date();
  const date = now.toISOString().replaceAll(":", "-");
  return `${prefix}-${date}.csv`;
}
