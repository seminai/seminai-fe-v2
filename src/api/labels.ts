const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

export type LabelSummary = {
  id: string;
  productName: string;
  registrationNumber: string;
  extractionConfidence: number;
  qualityExtraction: number[];
  errors: string[];
  isVerified: boolean;
  category?: string;
  createdAt: string;
};

export type LabelsSummaryResponse = {
  status: "success";
  data: LabelSummary[];
};

export type LabelDosaggioDettagliato = {
  coltura: string;
  malattia: string;
  dose_minima: number;
  dose_massima: number;
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
  colture_target_fuori_periodo_di_prodizione?: string[] | null;
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
  isVerified: boolean;
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

export type BulkDeleteResponse = {
  status: "success";
  message: string;
  deleted_count: number;
};

async function bulkDeleteLabels(
  ids: string[],
  baseUrl: string
): Promise<BulkDeleteResponse> {
  const response = await fetch(`${baseUrl}/labels/bulk`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to delete labels");
  }

  return (await response.json()) as BulkDeleteResponse;
}

export type UpdateLabelPayload = Partial<{
  productName: string;
  registrationNumber: string;
  sourceUrl: string;
  extractionConfidence: number;
  extractedFields: string[];
  errors: string[];
  qualityExtraction: number[];
  rawText: string;
  label: Partial<LabelInner>;
}>;

export type UpdateLabelResponse = {
  status: "success";
  data: LabelDetail;
};

async function updateLabel(
  id: string,
  payload: UpdateLabelPayload,
  baseUrl: string
): Promise<UpdateLabelResponse> {
  const response = await fetch(`${baseUrl}/labels/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to update label");
  }

  return (await response.json()) as UpdateLabelResponse;
}

export type VerifyLabelPayload = {
  isVerified: boolean;
};

export type VerifyLabelResponse = {
  status: "success";
  data: LabelDetail;
};

async function verifyLabel(
  id: string,
  payload: VerifyLabelPayload,
  baseUrl: string
): Promise<VerifyLabelResponse> {
  const response = await fetch(
    `${baseUrl}/labels/verify-label/${encodeURIComponent(id)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to verify label");
  }

  return (await response.json()) as VerifyLabelResponse;
}

async function updateLabelOverwrite(
  id: string,
  baseUrl: string
): Promise<UpdateLabelResponse> {
  const response = await fetch(
    `${baseUrl}/labels/update-label/${encodeURIComponent(id)}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to update label");
  }

  return (await response.json()) as UpdateLabelResponse;
}

async function extractWithMistral(
  id: string,
  baseUrl: string
): Promise<LabelDetailResponse> {
  const response = await fetch(
    `${baseUrl}/labels/extract-with-mistral/${encodeURIComponent(id)}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to extract label with Mistral");
  }

  return (await response.json()) as LabelDetailResponse;
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

  public async bulkDelete(ids: string[]): Promise<BulkDeleteResponse> {
    return await bulkDeleteLabels(ids, this.baseUrl);
  }

  public async update(
    id: string,
    payload: UpdateLabelPayload
  ): Promise<UpdateLabelResponse> {
    return await updateLabel(id, payload, this.baseUrl);
  }

  public async verify(
    id: string,
    payload: VerifyLabelPayload
  ): Promise<VerifyLabelResponse> {
    return await verifyLabel(id, payload, this.baseUrl);
  }

  public async updateOverwrite(id: string): Promise<UpdateLabelResponse> {
    return await updateLabelOverwrite(id, this.baseUrl);
  }

  public async extractWithMistral(id: string): Promise<LabelDetailResponse> {
    return await extractWithMistral(id, this.baseUrl);
  }
}

export const labelsApiService = new LabelsApiService(BASE_URL);
