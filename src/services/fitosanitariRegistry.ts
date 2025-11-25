export interface FitosanitarioRecord {
  num_registrazione: string;
  denominazione_prodotto: string;
}

export interface FitosanitariDatasetRecord {
  registrationNumber: string;
  productName: string;
  companyName: string;
  administrativeStatus: string;
  hazardStatements: string;
  activity: string;
  formulationCode: string;
  formulationDescription: string;
  activeIngredients: string;
  contentPer100g: string;
  authorizationExpiry: string;
  parallelImport: string;
}

class FitosanitariRegistry {
  private static instance: FitosanitariRegistry | null = null;
  private readonly datasetUrl = "/datasets/fitosanitari/fts_06062025.json";
  private readonly revokedStatuses = new Set(["revocato"]);
  private index: Map<string, string> | null = null;
  private records: FitosanitariDatasetRecord[] | null = null;

  private constructor() {}

  public static getInstance(): FitosanitariRegistry {
    if (!FitosanitariRegistry.instance) {
      FitosanitariRegistry.instance = new FitosanitariRegistry();
    }
    return FitosanitariRegistry.instance;
  }

  public async loadIndex(): Promise<Map<string, string>> {
    if (this.index) {
      return this.index;
    }
    const dataset = await this.getRecords();
    const map = new Map<string, string>();
    dataset.forEach((record) => {
      if (record.productName && record.registrationNumber) {
        map.set(record.productName.toLowerCase(), record.registrationNumber);
      }
    });
    this.index = map;
    return this.index;
  }

  public async findRegistrationNumberByName(
    name: string
  ): Promise<string | null> {
    const normalizedName = name?.trim().toLowerCase();
    if (!normalizedName) {
      return null;
    }
    const index = await this.loadIndex();
    const exact = index.get(normalizedName);
    if (exact) {
      return exact;
    }
    for (const [key, value] of index.entries()) {
      if (key.includes(normalizedName)) {
        return value;
      }
    }
    return null;
  }

  public async getAuthorizedRecords(): Promise<FitosanitariDatasetRecord[]> {
    const dataset = await this.getRecords();
    return dataset.filter((record) => {
      const normalizedStatus = record.administrativeStatus
        .trim()
        .toLowerCase();
      if (normalizedStatus.length === 0) {
        return true;
      }
      return !this.revokedStatuses.has(normalizedStatus);
    });
  }

  private async getRecords(): Promise<FitosanitariDatasetRecord[]> {
    if (this.records) {
      return this.records;
    }
    const response = await fetch(this.datasetUrl);
    if (!response.ok) {
      throw new Error("Unable to load fitosanitari dataset");
    }

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    const normalized = payload
      .map((row) => this.normalizeRecord(row))
      .filter(
        (record) =>
          record.registrationNumber.length > 0 && record.productName.length > 0
      );

    this.records = normalized;
    return this.records;
  }

  private normalizeRecord(
    row: Record<string, unknown>
  ): FitosanitariDatasetRecord {
    const getValue = (key: string): string => {
      const rawValue = row[key];
      return rawValue === null || rawValue === undefined
        ? ""
        : String(rawValue).trim();
    };

    return {
      registrationNumber: getValue("num_registrazione"),
      productName: getValue("denominazione_prodotto"),
      companyName: getValue("ragione_sociale"),
      administrativeStatus: getValue("stato_amministrativo"),
      hazardStatements: getValue("indicazioni_di_pericolo"),
      activity: getValue("attivita"),
      formulationCode: getValue("codice_formulazione"),
      formulationDescription: getValue("descrizione_formulazione"),
      activeIngredients: getValue("sostanze_attive"),
      contentPer100g: getValue("contenuto_per_100g_di_prodotto"),
      authorizationExpiry: getValue("data_scadenza_autorizzazione"),
      parallelImport: getValue("importazione_parallela"),
    };
  }
}

const registryInstance = FitosanitariRegistry.getInstance();

export async function loadFitosanitariIndex(): Promise<Map<string, string>> {
  return registryInstance.loadIndex();
}

export async function findRegNumberByName(
  name: string
): Promise<string | null> {
  return registryInstance.findRegistrationNumberByName(name);
}

export async function getAuthorizedFitosanitariRecords(): Promise<
  FitosanitariDatasetRecord[]
> {
  return registryInstance.getAuthorizedRecords();
}
