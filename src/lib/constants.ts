// Application constants

// Pagination
export const PAGE_SIZES = [
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
  { value: "all", label: "All" },
] as const;

export const DEFAULT_PAGE_SIZE = "50";
export const DEFAULT_PAGE = 1;
export const MAX_PAGINATION_BUTTONS = 5;
export const ITEMS_PER_PAGE = 50;

// Batch year labels
export function getBatchLabel(year: number | null): string {
  if (!year) return "Unknown";
  return `Y${String(year).slice(-2)}`;
}

// Filter suggestions for empty state
export const QUICK_SUGGESTIONS = ["Y23", "Y22", "Y21", "CSE", "EE"] as const;
