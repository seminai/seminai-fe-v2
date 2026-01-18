// Re-export types from API
export type {
  FieldNote,
  FieldNoteAttachment,
  ExtractedData,
  CreateFieldNoteRequest,
  UpdateFieldNoteRequest,
  FieldNoteFilters,
  FieldNotesStats,
  AgentToolCall,
  AgentResponse,
} from "@/api/field-notes";

export { FieldNoteCategory, FieldNoteStatus, AgentResponseStatus } from "@/api/field-notes";

// Types specifici per UI
export interface FieldNoteRowData extends Record<string, unknown> {
  id: string;
  category: string;
  rawContent: string;
  status: string;
  operationDate: string;
  extractedOperation?: string | null;
  extractedFields?: Array<{ name?: string; fieldId?: string }> | null;
  extractedProducts?: Array<{ name?: string; quantity?: number; unit?: string; productId?: string }> | null;
  companyName?: string | null;
  productionUnitName?: string | null;
  fieldId?: string | null;
  fieldName?: string | null;
  productionUnitId?: string | null;
  productId?: string | null;
  productName?: string | null;
  aiConfidenceScore?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  attachmentsCount: number;
  notes?: string | null;
  createdAt: string;
}
