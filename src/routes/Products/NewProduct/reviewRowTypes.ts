import type { ProductImportPreviewRow } from "../productImportPreview.table";

/**
 * A product row enriched with step 2–specific decisions: user acceptance flag
 * and the cached conversion ratio (quantityConverted / quantity) captured at
 * review-time so quantity edits in step 2 stay internally consistent.
 */
export interface ReviewRowState extends ProductImportPreviewRow {
  accepted: boolean;
  conversionRatio: number | null;
}

export function toReviewRows(
  rows: ProductImportPreviewRow[],
): ReviewRowState[] {
  return rows.map((r) => ({
    ...r,
    accepted: true,
    conversionRatio:
      r.quantityConverted != null && r.quantity > 0
        ? r.quantityConverted / r.quantity
        : null,
  }));
}
