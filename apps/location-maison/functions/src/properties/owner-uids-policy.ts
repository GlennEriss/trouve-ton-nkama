export function buildOwnerUids(data: Record<string, unknown>): string[] {
  return [...new Set([data.createdBy, data.claimedBy]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim()))].sort();
}

export function hasExpectedOwnerUids(current: unknown, expected: string[]): boolean {
  if (!Array.isArray(current) || current.some((value) => typeof value !== 'string')) return false;
  const normalized = [...new Set(current.map((value) => value.trim()).filter(Boolean))].sort();
  return normalized.length === expected.length
    && normalized.every((value, index) => value === expected[index]);
}
