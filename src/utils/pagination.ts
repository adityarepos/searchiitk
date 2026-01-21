import { MAX_PAGINATION_BUTTONS } from "@/lib/constants";

export function getPaginationPages(
  currentPage: number,
  totalPages: number
): (number | string)[] {
  const pages: (number | string)[] = [];

  if (totalPages <= MAX_PAGINATION_BUTTONS + 2) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return pages;
}

export function getPaginationMeta(
  currentPage: number,
  pageSize: number | "all",
  totalItems: number
) {
  const pageSizeNum = pageSize === "all" ? totalItems || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSizeNum));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (validPage - 1) * pageSizeNum;
  const endIdx = pageSize === "all" ? totalItems : startIdx + pageSizeNum;

  return { totalPages, validPage, startIdx, endIdx, pageSizeNum };
}
