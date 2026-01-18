import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export enum FieldNoteCategory {
  OPERATION = "OPERATION",
  OBSERVATION = "OBSERVATION",
  MEASUREMENT = "MEASUREMENT",
  HARVEST = "HARVEST",
  MAINTENANCE = "MAINTENANCE",
  OTHER = "OTHER",
}

export enum FieldNoteStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  PROCESSED = "PROCESSED",
  FAILED = "FAILED",
  MANUALLY_REVIEWED = "MANUALLY_REVIEWED",
}

export enum AgentResponseStatus {
  COMPLETED = "COMPLETED",
  REQUIRES_APPROVAL = "REQUIRES_APPROVAL",
  ERROR = "ERROR",
}

// ─────────────────────────────────────────────────────────────────────────────
// Types - Field Note Data
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractedData {
  recognizedProducts?: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    productId?: string;
  }>;
  recognizedFields?: Array<{
    name: string;
    fieldId?: string;
  }>;
  operation?: string;
  observations?: string[];
  measurements?: Array<{
    type: string;
    value: number;
    unit: string;
  }>;
}

export interface FieldNoteAttachment {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl: string | null;
  aiAnalysis: Record<string, unknown> | null;
  createdAt: string;
}

export interface FieldNote {
  id: string;
  userId: string;
  category: FieldNoteCategory;
  status: FieldNoteStatus;
  rawContent: string;
  extractedData: ExtractedData | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  gpsAccuracy: number | null;
  operationDate: string; // ISO 8601
  fieldId: string | null;
  fieldName?: string | null;
  field?: {
    id: string;
    name: string;
    companyId: string;
    company?: {
      id: string;
      name: string;
    };
  } | Array<{
    id: string;
    name: string;
  }> | null;
  productionUnitId: string | null;
  productionUnitName?: string | null;
  productionUnit?: {
    id: string;
    name: string;
    companyId: string;
    company?: {
      id: string;
      name: string;
    };
  } | null;
  productId: string | null;
  productName?: string | null;
  product?: {
    id: string;
    name: string;
    sku?: string;
    category?: string;
    companyId: string;
    company?: {
      id: string;
      name: string;
    };
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
  jobId: string | null;
  metadata: Record<string, unknown> | null;
  aiConfidenceScore: number | null;
  notes: string | null;
  attachments: FieldNoteAttachment[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ─────────────────────────────────────────────────────────────────────────────
// Types - Agent Chat
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
  id: string;
}

export interface AgentResponse {
  status: AgentResponseStatus;
  message?: string;
  pendingToolCalls?: AgentToolCall[];
  error?: string;
  pendingFieldNote?: {
    category: FieldNoteCategory;
    rawContent: string;
    extractedData: ExtractedData;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types - Request/Response
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateFieldNoteRequest {
  category: FieldNoteCategory;
  rawContent: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  gpsAccuracy?: number;
  operationDate?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateFieldNoteRequest {
  category?: FieldNoteCategory;
  rawContent?: string;
  status?: FieldNoteStatus;
  fieldId?: string | null;
  productionUnitId?: string | null;
  productId?: string | null;
  notes?: string;
  extractedData?: ExtractedData;
  aiConfidenceScore?: number;
  latitude?: number;
  longitude?: number;
  operationDate?: string;
}

export interface FieldNoteFilters {
  category?: FieldNoteCategory;
  status?: FieldNoteStatus;
  fieldId?: string;
  productionUnitId?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
  hasLocation?: boolean;
  hasAttachments?: boolean;
}

export interface FieldNotesStats {
  totalNotes: number;
  byStatus: Record<FieldNoteStatus, number>;
  byCategory: Record<FieldNoteCategory, number>;
  withLocation: number;
  withAttachments: number;
  averageConfidenceScore: number;
}

export interface ChatMessageRequest {
  threadId: string;
  message: string;
  modelName?: "gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo";
  temperature?: number;
}

export interface ApproveActionRequest {
  threadId: string;
}

export interface RejectActionRequest {
  threadId: string;
  feedback: string;
}

export interface ConversationStateResponse {
  messages: Array<{
    role: "human" | "ai";
    content: string;
  }>;
  pendingFieldNote?: {
    category: FieldNoteCategory;
    rawContent: string;
    extractedData: ExtractedData;
  };
}

export interface AddAttachmentRequest {
  fieldNoteId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Service
// ─────────────────────────────────────────────────────────────────────────────

class FieldNotesApiService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD Endpoints
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Crea una nuova field note
   */
  async createFieldNote(request: CreateFieldNoteRequest): Promise<FieldNote> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-notes`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Create field note failed");
    }

    const jsonData = await response.json();
    return jsonData.data;
  }

  /**
   * Ottiene la lista di field notes con filtri opzionali
   */
  async getFieldNotes(filters?: FieldNoteFilters): Promise<FieldNote[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.category) params.append("category", filters.category);
      if (filters.status) params.append("status", filters.status);
      if (filters.fieldId) params.append("fieldId", filters.fieldId);
      if (filters.productionUnitId) params.append("productionUnitId", filters.productionUnitId);
      if (filters.productId) params.append("productId", filters.productId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.hasLocation !== undefined) params.append("hasLocation", String(filters.hasLocation));
      if (filters.hasAttachments !== undefined) params.append("hasAttachments", String(filters.hasAttachments));
    }

    const queryString = params.toString();
    const url = queryString 
      ? `${this.baseUrl}/field-notes?${queryString}` 
      : `${this.baseUrl}/field-notes`;

    const response = await authenticatedHttpClient.request(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Get field notes failed");
    }

    const jsonData = await response.json();
    // La risposta API ha struttura { status: "success", data: { fieldNotes: [...], count: number } }
    return jsonData.data?.fieldNotes || jsonData.data || [];
  }

  /**
   * Ottiene una singola field note per ID
   */
  async getFieldNote(id: string): Promise<FieldNote> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-notes/${id}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Get field note failed");
    }

    const jsonData = await response.json();
    return jsonData.data;
  }

  /**
   * Aggiorna una field note esistente
   */
  async updateFieldNote(
    id: string,
    request: UpdateFieldNoteRequest
  ): Promise<FieldNote> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-notes/${id}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Update field note failed");
    }

    const jsonData = await response.json();
    return jsonData.data;
  }

  /**
   * Elimina una field note
   */
  async deleteFieldNote(id: string): Promise<void> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-notes/${id}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Delete field note failed");
    }
  }

  /**
   * Ottiene statistiche sulle field notes
   */
  async getFieldNotesStats(): Promise<FieldNotesStats> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-notes/stats`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Get field notes stats failed");
    }

    const jsonData = await response.json();
    return jsonData.data.stats;
  }

  /**
   * Aggiunge un attachment a una field note
   */
  async addAttachment(request: AddAttachmentRequest): Promise<FieldNoteAttachment> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-notes/attachments`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Add attachment failed");
    }

    const jsonData = await response.json();
    return jsonData.data;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Chat Agent Endpoints
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Invia un messaggio alla chat AI
   * Socket.IO riceverà gli eventi di streaming in tempo reale
   */
  async sendMessage(request: ChatMessageRequest): Promise<AgentResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-note-agent/message`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Send message failed");
    }

    const jsonData = await response.json();
    return jsonData.data;
  }

  /**
   * Approva l'azione proposta dall'AI
   */
  async approveAction(request: ApproveActionRequest): Promise<AgentResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-note-agent/approve`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Approve action failed");
    }

    const jsonData = await response.json();
    return jsonData.data;
  }

  /**
   * Rifiuta l'azione proposta dall'AI con feedback
   */
  async rejectAction(request: RejectActionRequest): Promise<AgentResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-note-agent/reject`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Reject action failed");
    }

    const jsonData = await response.json();
    return jsonData.data;
  }

  /**
   * Ottiene lo stato della conversazione corrente
   */
  async getConversationState(threadId: string): Promise<ConversationStateResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-note-agent/state/${threadId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Get conversation state failed");
    }

    const jsonData = await response.json();
    return jsonData.data;
  }
}

export const fieldNotesApiService = new FieldNotesApiService(BASE_URL);
