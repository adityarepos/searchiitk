// Application constants

// Pagination
export const ITEMS_PER_PAGE = 50;

// Batch year labels
export function getBatchLabel(year: number | null): string {
  if (!year) return "Unknown";
  return `Y${String(year).slice(-2)}`;
}
