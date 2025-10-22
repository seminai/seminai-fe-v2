const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

export type LabelSummary = {
  id: string;
  productName: string;
  registrationNumber: string;
  extractionConfidence: number;
  qualityExtraction: number[];
  errors: string[];
};

export type LabelsSummaryResponse = {
  status: "success";
  data: LabelSummary[];
};

export type LabelDosaggioDettagliato = {
  coltura: string;
  malattia: string;
  dose: number;
  dose_um: string;
  acqua_max?: number;
  acqua_max_um?: string;
  n_max_applicazioni?: number;
  n_max_applicazioni_um?: string;
  intervallo_min_giorni?: number;
  intervallo_sicurezza_giorni?: number;
  epoca_impiego?: string;
  modalita_applicazione?: string;
  istruzioni?: string;
};

export type LabelInner = {
  prodotto?: string;
  categoria?: string;
  formulazione?: string;
  principio_attivo?: string;
  composizione?: string;
  meccanismo_azione_frac?: string;
  malattie?: string[];
  specie?: string[];
  colture_target?: string[];
  dosaggi_dettagliati?: LabelDosaggioDettagliato[];
  fasce_di_rispetto_e_deriva?: unknown[];
  avvertenze?: unknown[];
  frasi_pericolo?: unknown[];
  frasi_prudenza?: unknown[];
  compatibilita?: string | null;
  fitotossicita?: string | null;
  note_tecniche?: string | null;
  extraction_confidence?: number;
  extracted_fields?: string[];
  errors?: string[];
  numero_registrazione?: string;
  titolare?: string;
  stabilimento?: string;
  caratteristiche?: string;
};

export type LabelDetail = {
  id: string;
  productName: string;
  registrationNumber: string;
  sourceUrl: string;
  label: LabelInner;
  rawText: string;
  extractionConfidence: number;
  extractedFields: string[];
  errors: string[];
  qualityExtraction: number[];
  createdAt: string;
  updatedAt: string;
};

export type LabelDetailResponse = {
  status: "success";
  data: LabelDetail;
};

export type BulkExtractItem = {
  name: string;
  regNumber: string;
};

export type BulkExtractRequest = {
  items: BulkExtractItem[];
  concurrency: number;
};

export type BulkExtractResponse = {
  status: "success";
  data: {
    processed: number;
    successful: number;
    failed: number;
    results: LabelSummary[];
  };
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function getLabelsSummary(
  baseUrl: string = BASE_URL
): Promise<LabelsSummaryResponse> {
  const response = await fetch(`${baseUrl}/labels/summary`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to load labels summary");
  }

  return (await response.json()) as LabelsSummaryResponse;
}

export async function getLabelById(
  id: string,
  baseUrl: string = BASE_URL
): Promise<LabelDetailResponse> {
  const response = await fetch(`${baseUrl}/labels/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to load label detail");
  }

  return (await response.json()) as LabelDetailResponse;
}

export async function bulkExtractLabels(
  request: BulkExtractRequest,
  baseUrl: string = BASE_URL
): Promise<BulkExtractResponse> {
  const response = await fetch(`${baseUrl}/labels/bulk-extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to extract labels");
  }

  return (await response.json()) as BulkExtractResponse;
}

class LabelsApiService {
  private readonly baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getSummary(): Promise<LabelsSummaryResponse> {
    return await getLabelsSummary(this.baseUrl);
  }

  public async getById(id: string): Promise<LabelDetailResponse> {
    return await getLabelById(id, this.baseUrl);
  }

  public async bulkExtract(
    request: BulkExtractRequest
  ): Promise<BulkExtractResponse> {
    return await bulkExtractLabels(request, this.baseUrl);
  }
}

export const labelsApiService = new LabelsApiService(BASE_URL);
