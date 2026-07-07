export function withActiveRecords(whereClause: Record<string, any> = {}) {
  return {
    ...whereClause,
    deletedAt: null
  };
}
