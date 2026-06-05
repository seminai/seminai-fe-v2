/**
 * Parser per CSV di import Production Units con Fields
 * Supporta due formati:
 * - Format 1: campi base (field_production_unit_test_1.csv)
 * - Format 2: campi completi con dati aggiuntivi (field_production_unit_test_2.csv)
 */

export type ParsedField = {
  companyName: string;
  vatNumber: string;
  name: string;
  coordinates?: [number, number];
  latitude?: number;
  longitude?: number;
  polygon?: string;
  gisHa?: number;
  sauHa?: number;
  ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  calcium?: number;
  magnesium?: number;
  soilType?: string;
  uso?: string;
  qualita?: string;
  superficieCatastaleMq?: number;
  sezione?: string;
  foglio?: string;
  particella?: string;
  subalterno?: string;
  nation?: string;
  region?: string;
  city?: string;
  address?: string;
  cap?: string;
  variazioneMq?: number;
  inizioConduzione?: string;
  fineConduzione?: string;
};

export type ParsedProductionUnit = {
  name: string;
  cropName: string;
  cropType: string;
  variety: string;
  protocoll: string;
  protectionStructure: string;
  startDate?: string; // ISO format
  floweringDate?: string; // ISO format
  harvestingDate?: string; // ISO format
  endDate?: string; // ISO format
  occupazione?: string;
  destinazioneDiUso?: string;
  acquaTotalePeridoL?: number;
  fieldAllocations: Array<{
    fieldName: string;
    sezione?: string;
    foglio?: string;
    particella?: string;
    subalterno?: string;
    areaHa: number;
  }>;
};

export type ParsedBulkImport = {
  companyName: string;
  vatNumber: string;
  fields: Array<Omit<ParsedField, "companyName" | "vatNumber">>;
  productionUnits: ParsedProductionUnit[];
};

type CropVarietySummary = {
  code: string;
  species: string;
  cropType: string;
};

export type ProductionUnitParserOptions = {
  cropVarieties?: CropVarietySummary[];
};

class NumberParser {
  public static parse(value: string | undefined): number | null {
    if (!value) {
      return null;
    }

    let sanitized = value.replace(/\s+/g, "").replace(/\u00a0/g, "");
    if (sanitized.includes(",")) {
      sanitized = sanitized.replace(/\./g, "").replace(",", ".");
    }
    sanitized = sanitized.replace(/[^0-9.-]/g, "");

    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

class DateParser {
  public static toIso(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const normalized = trimmed.replace(/\./g, "/");
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
      const [day, month, year] = normalized.split("/");
      const isoDate = new Date(
        Date.UTC(Number(year), Number(month) - 1, Number(day))
      );
      return isNaN(isoDate.getTime()) ? undefined : isoDate.toISOString();
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      const isoDate = new Date(`${normalized}T00:00:00Z`);
      return isNaN(isoDate.getTime()) ? undefined : isoDate.toISOString();
    }

    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }
}

class TextFormatter {
  public static cleanLabel(value: string | undefined): string {
    if (!value) {
      return "";
    }
    return value
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  public static normalize(value: string | undefined): string {
    return TextFormatter.cleanLabel(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
}

class CropMatcher {
  private readonly catalog: CropVarietySummary[];

  constructor(catalog: CropVarietySummary[] = []) {
    this.catalog = catalog;
  }

  public resolve(
    occupazione: string | undefined
  ): { cropName: string; cropType: string; variety: string } {
    const cleaned = TextFormatter.cleanLabel(occupazione);
    const normalizedOccupazione = TextFormatter.normalize(occupazione);

    if (normalizedOccupazione) {
      const match = this.catalog.find((entry) => {
        const speciesNorm = TextFormatter.normalize(entry.species);
        const cropTypeNorm = TextFormatter.normalize(entry.cropType);
        return (
          normalizedOccupazione.includes(speciesNorm) ||
          speciesNorm.includes(normalizedOccupazione) ||
          normalizedOccupazione.includes(cropTypeNorm) ||
          cropTypeNorm.includes(normalizedOccupazione)
        );
      });

      if (match) {
        return {
          cropName: match.species,
          cropType: match.cropType,
          variety: match.code,
        };
      }
    }

    const fallbackLabel = cleaned || "Coltura non specificata";
    return {
      cropName: fallbackLabel,
      cropType: fallbackLabel,
      variety: fallbackLabel.replace(/\s+/g, "_").toUpperCase(),
    };
  }
}

type AgeaCompanyProfile = {
  companyName: string;
  vatNumber: string;
};

type AgeaRow = Record<string, string>;

class AggregatedProductionUnit {
  private readonly fieldAllocations = new Map<
    string,
    {
      fieldName: string;
      sezione?: string;
      foglio?: string;
      particella?: string;
      subalterno?: string;
      areaHa: number;
    }
  >();
  private startDate?: string;
  private endDate?: string;

  constructor(
    private readonly baseData: {
      name: string;
      cropName: string;
      cropType: string;
      variety: string;
      protocoll: string;
      protectionStructure: string;
      startDate?: string;
      endDate?: string;
      occupazione?: string;
      destinazioneDiUso?: string;
    }
  ) {
    this.startDate = baseData.startDate;
    this.endDate = baseData.endDate;
  }

  public mergePeriod(startDate?: string, endDate?: string): void {
    if (startDate) {
      if (!this.startDate || startDate < this.startDate) {
        this.startDate = startDate;
      }
    }
    if (endDate) {
      if (!this.endDate || endDate > this.endDate) {
        this.endDate = endDate;
      }
    }
  }

  public addAllocation(field: ParsedField, areaHa: number): void {
    const key =
      field.name && field.name.trim().length > 0
        ? field.name
        : `${field.foglio ?? ""}-${field.particella ?? ""}`;

    const allocation =
      this.fieldAllocations.get(key) ??
      {
        fieldName: field.name,
        sezione: field.sezione,
        foglio: field.foglio,
        particella: field.particella,
        subalterno: field.subalterno,
        areaHa: 0,
      };

    allocation.areaHa = parseFloat(
      (allocation.areaHa + areaHa).toFixed(4)
    );
    this.fieldAllocations.set(key, allocation);
  }

  public toParsedProductionUnit(): ParsedProductionUnit {
    return {
      name: this.baseData.name,
      cropName: this.baseData.cropName,
      cropType: this.baseData.cropType,
      variety: this.baseData.variety,
      protocoll: this.baseData.protocoll,
      protectionStructure: this.baseData.protectionStructure,
      startDate: this.startDate,
      floweringDate: undefined,
      harvestingDate: undefined,
      endDate: this.endDate,
      occupazione: this.baseData.occupazione,
      destinazioneDiUso: this.baseData.destinazioneDiUso,
      acquaTotalePeridoL: undefined,
      fieldAllocations: Array.from(this.fieldAllocations.values()),
    };
  }
}

class AgeaCompanyGroup {
  private readonly fields = new Map<string, ParsedField>();
  private readonly productionUnits = new Map<string, AggregatedProductionUnit>();

  constructor(private readonly profile: AgeaCompanyProfile) {}

  public addField(field: ParsedField): void {
    const key = [
      field.name,
      field.sezione ?? "",
      field.foglio ?? "",
      field.particella ?? "",
    ]
      .join("|")
      .toLowerCase();

    if (!this.fields.has(key)) {
      this.fields.set(key, field);
    }
  }

  public getOrCreateProductionUnit(
    key: string,
    factory: () => AggregatedProductionUnit
  ): AggregatedProductionUnit {
    if (!this.productionUnits.has(key)) {
      this.productionUnits.set(key, factory());
    }
    return this.productionUnits.get(key)!;
  }

  public toParsedBulkImport(): ParsedBulkImport {
    return {
      companyName: this.profile.companyName,
      vatNumber: this.profile.vatNumber,
      fields: Array.from(this.fields.values()).map((field) => {
        const { companyName, vatNumber, ...fieldData } = field;
        void companyName;
        void vatNumber;
        return fieldData;
      }),
      productionUnits: Array.from(this.productionUnits.values()).map((unit) =>
        unit.toParsedProductionUnit()
      ),
    };
  }
}

class AgeaProductionUnitBuilder {
  private readonly groups = new Map<string, AgeaCompanyGroup>();

  constructor(
    private readonly rows: AgeaRow[],
    private readonly cropMatcher: CropMatcher
  ) {}

  public build(): ParsedBulkImport[] {
    this.rows.forEach((row, index) => {
      const company = this.resolveCompany(row, index);
      const groupKey = `${company.companyName}|${company.vatNumber}`;
      const group =
        this.groups.get(groupKey) ?? new AgeaCompanyGroup(company);
      this.groups.set(groupKey, group);

      const field = this.buildField(row, company, index);
      group.addField(field);
      this.addAllocation(group, field, row);
    });

    return Array.from(this.groups.values()).map((group) =>
      group.toParsedBulkImport()
    );
  }

  private resolveCompany(row: AgeaRow, index: number): AgeaCompanyProfile {
    const fallbackName = `Azienda import ${index + 1}`;
    const companyName =
      TextFormatter.cleanLabel(row["Conduttore"]) ||
      TextFormatter.cleanLabel(row["Az cond asservimento"]) ||
      fallbackName;
    const vatNumber =
      TextFormatter.cleanLabel(row["Az cond asservimento"]) ||
      TextFormatter.cleanLabel(row["Id appezzamento AGEA"]) ||
      TextFormatter.cleanLabel(row["Id appezzamento"]) ||
      companyName;

    return { companyName, vatNumber };
  }

  private buildField(
    row: AgeaRow,
    company: AgeaCompanyProfile,
    index: number
  ): ParsedField {
    const sau = NumberParser.parse(row["Superficie Agricola"]);
    const gis = NumberParser.parse(row["Superficie Grafica"]);
    const catastale = NumberParser.parse(row["Superficie Catastale"]);
    const eleggibileNetta = NumberParser.parse(
      row["Superficie Eleggibile Netta"]
    );

    const fieldName =
      TextFormatter.cleanLabel(row["Unita produttiva"]) ||
      TextFormatter.cleanLabel(row["Comune Descrizione"]) ||
      `Campo import ${index + 1}`;

    return {
      companyName: company.companyName,
      vatNumber: company.vatNumber,
      name: fieldName,
      sauHa: sau ?? undefined,
      gisHa: gis ?? undefined,
      superficieCatastaleMq: catastale ?? undefined,
      sezione: TextFormatter.cleanLabel(row["Sezione"]),
      foglio: TextFormatter.cleanLabel(row["Foglio"]),
      particella: TextFormatter.cleanLabel(row["Particella"]),
      subalterno: TextFormatter.cleanLabel(row["Subalterno"]),
      uso: TextFormatter.cleanLabel(row["Uso Uso Suolo Primario"]),
      qualita: TextFormatter.cleanLabel(row["Qualita Uso Suolo Primario"]),
      address: TextFormatter.cleanLabel(row["Comune Descrizione"]),
      city: TextFormatter.cleanLabel(row["Comune Descrizione"]),
      variazioneMq: eleggibileNetta ?? undefined,
      nation: "Italia",
      region: TextFormatter.cleanLabel(row["Zona Alt"]),
    };
  }

  private addAllocation(
    group: AgeaCompanyGroup,
    field: ParsedField,
    row: AgeaRow
  ): void {
    const occupazione = TextFormatter.cleanLabel(
      row["Occupazione Suolo Uso Suolo Primario"]
    );
    const area = NumberParser.parse(row["Superficie Uso Suolo Primario"]);

    if (!occupazione || !area || area <= 0) {
      return;
    }

    const startDateIso = DateParser.toIso(row["Data inizio Semina Primario"]);
    const endDateIso = DateParser.toIso(row["Data fine Semina Primario"]);
    const key = [
      TextFormatter.normalize(occupazione),
      startDateIso ?? "__no_start__",
      endDateIso ?? "__no_end__",
    ].join("|");

    const cropInfo = this.cropMatcher.resolve(occupazione);
    const unit = group.getOrCreateProductionUnit(key, () => {
      return new AggregatedProductionUnit({
        name: occupazione,
        cropName: cropInfo.cropName,
        cropType: cropInfo.cropType,
        variety: cropInfo.variety,
        protocoll:
          TextFormatter.cleanLabel(row["Rotazione colturale"]) || "AGEA",
        protectionStructure:
          TextFormatter.cleanLabel(row["Tipo Semina Primario"]) ||
          "Non specificato",
        startDate: startDateIso,
        endDate: endDateIso,
        occupazione,
        destinazioneDiUso: TextFormatter.cleanLabel(
          row["Destinazione Uso Suolo Primario"]
        ),
      });
    });

    unit.mergePeriod(startDateIso, endDateIso);
    unit.addAllocation(field, area);
  }
}

// Helper per convertire una data in formato ISO
const parseDate = (dateStr: string | undefined): string | undefined => {
  if (!dateStr || dateStr.trim() === "") return undefined;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  } catch {
    return undefined;
  }
};

// Helper per parsare coordinate
const parseCoordinates = (
  coordStr: string | undefined
): [number, number] | undefined => {
  if (!coordStr) return undefined;
  try {
    // Formato: "[12.345678,45.678901]"
    const cleaned = coordStr.replace(/[[\]]/g, "");
    const parts = cleaned.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
  } catch {
    return undefined;
  }
  return undefined;
};

// Helper per rilevare il separatore CSV
function detectCSVSeparator(csvText: string): string {
  const firstLine = csvText.split("\n")[0];

  // Conta occorrenze di separatori comuni
  const separators = [",", ";", "\t", "|"];
  const counts = separators.map((sep) => ({
    separator: sep,
    count: firstLine.split(sep).length - 1,
  }));

  // Ordina per numero di occorrenze (dal più alto)
  counts.sort((a, b) => b.count - a.count);

  const detected = counts[0].count > 0 ? counts[0].separator : ",";
  console.log(
    `🔍 CSV Parser - Separatore rilevato: "${detected}" (occorrenze: ${counts[0].count})`
  );

  return detected;
}

// Helper per parsare CSV in array di oggetti con supporto per virgolette
export function parseCSV(csvText: string): Record<string, string>[] {
  // Normalizza le fine riga (Windows: \r\n, Mac: \r, Unix: \n)
  const normalizedText = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedText.trim().split("\n");

  if (lines.length < 2) return [];

  // Rileva automaticamente il separatore
  const separator = detectCSVSeparator(normalizedText);

  // Funzione per parsare una linea CSV gestendo le virgolette
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Virgolette doppie dentro un campo quotato = una virgoletta letterale
          current += '"';
          i++; // Salta la prossima virgoletta
        } else {
          // Toggle dello stato quotato
          inQuotes = !inQuotes;
        }
      } else if (char === separator && !inQuotes) {
        // Separatore fuori dalle virgolette
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    // Aggiungi l'ultimo campo
    result.push(current);

    return result.map((field) => field.trim());
  };

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Salta righe vuote

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    // Aggiungi solo se la riga ha almeno un valore non vuoto
    if (Object.values(row).some((val) => val !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

// Funzione principale per parsare il CSV e creare la struttura per il bulk-import
export function parseProductionUnitCSV(
  csvText: string,
  options?: ProductionUnitParserOptions
): ParsedBulkImport[] {
  const rows = parseCSV(csvText);

  console.log("🔍 CSV Parser - Righe parsate:", rows.length);
  if (rows.length > 0) {
    console.log("🔍 CSV Parser - Prima riga:", rows[0]);
    console.log("🔍 CSV Parser - Headers disponibili:", Object.keys(rows[0]));
  }

  if (rows.length === 0) {
    throw new Error("Il file CSV è vuoto o non valido");
  }

  if (isAgeaFormat(rows[0])) {
    console.log("🔍 CSV Parser - Rilevato formato AGEA/SIAN");
    const cropMatcher = new CropMatcher(options?.cropVarieties ?? []);
    return new AgeaProductionUnitBuilder(rows, cropMatcher).build();
  }

  return parseLegacyProductionUnits(rows);
}

function isAgeaFormat(row: Record<string, string>): boolean {
  const headers = Object.keys(row).map((header) =>
    header.trim().toLowerCase()
  );
  return headers.includes("occupazione suolo uso suolo primario".toLowerCase());
}

function parseLegacyProductionUnits(
  rows: Record<string, string>[]
): ParsedBulkImport[] {
  // Raggruppa le righe per companyName e vatNumber
  const groupedByCompany = new Map<
    string,
    {
      companyName: string;
      vatNumber: string;
      rows: Record<string, string>[];
    }
  >();

  rows.forEach((row, index) => {
    const companyName = row.companyName;
    const vatNumber = row.vatNumber;

    if (index === 0) {
      console.log(`🔍 CSV Parser - Riga ${index + 1}:`, {
        companyName,
        vatNumber,
        allFields: Object.keys(row),
      });
    }

    const key = `${companyName}_${vatNumber}`;

    if (!groupedByCompany.has(key)) {
      groupedByCompany.set(key, {
        companyName,
        vatNumber,
        rows: [],
      });
    }

    groupedByCompany.get(key)!.rows.push(row);
  });

  console.log("🔍 CSV Parser - Aziende trovate:", groupedByCompany.size);

  // Per ogni azienda, crea la struttura di bulk-import
  const results: ParsedBulkImport[] = [];

  groupedByCompany.forEach((group) => {
    // Mappa unica dei campi (per nome)
    const fieldsMap = new Map<string, ParsedField>();
    // Mappa delle production units (per nome)
    const productionUnitsMap = new Map<string, ParsedProductionUnit>();

    group.rows.forEach((row) => {
      // Parsing del campo (field)
      const fieldName = row.name;
      if (!fieldsMap.has(fieldName)) {
        fieldsMap.set(fieldName, {
          companyName: group.companyName,
          vatNumber: group.vatNumber,
          name: fieldName,
          coordinates: parseCoordinates(row.coordinates),
          latitude: row.latitude ? parseFloat(row.latitude) : undefined,
          longitude: row.longitude ? parseFloat(row.longitude) : undefined,
          polygon: row.polygon,
          gisHa: row.gisHa ? parseFloat(row.gisHa) : undefined,
          sauHa: row.sauHa ? parseFloat(row.sauHa) : undefined,
          ph: row.ph ? parseFloat(row.ph) : undefined,
          nitrogen: row.nitrogen ? parseFloat(row.nitrogen) : undefined,
          phosphorus: row.phosphorus ? parseFloat(row.phosphorus) : undefined,
          potassium: row.potassium ? parseFloat(row.potassium) : undefined,
          calcium: row.calcium ? parseFloat(row.calcium) : undefined,
          magnesium: row.magnesium ? parseFloat(row.magnesium) : undefined,
          soilType: row.soilType,
          uso: row.uso,
          qualita: row.qualita,
          superficieCatastaleMq: row.superficieCatastaleMq
            ? parseFloat(row.superficieCatastaleMq)
            : undefined,
          sezione: row.sezione,
          foglio: row.foglio,
          particella: row.particella,
          subalterno: row.subalterno,
          nation: row.nation,
          region: row.region,
          city: row.city,
          address: row.address,
          cap: row.cap,
          variazioneMq: row.variazioneMq
            ? parseFloat(row.variazioneMq)
            : undefined,
          inizioConduzione: row.inizioConduzione,
          fineConduzione: row.fineConduzione,
        });
      }

      // Parsing della production unit (prefisso pu_)
      const puName = row.pu_name;
      if (puName) {
        if (!productionUnitsMap.has(puName)) {
          productionUnitsMap.set(puName, {
            name: puName,
            cropName: row.pu_cropName || "",
            cropType: row.pu_cropType || "",
            variety: row.pu_variety || "",
            protocoll: row.pu_protocoll || "",
            protectionStructure: row.pu_protectionStructure || "",
            startDate: parseDate(row.pu_startDate) || new Date().toISOString(),
            floweringDate: parseDate(row.pu_floweringDate),
            harvestingDate: parseDate(row.pu_harvestingDate),
            endDate: parseDate(row.pu_endDate),
            occupazione: row.pu_occupazione,
            destinazioneDiUso: row.pu_destinazioneDiUso,
            acquaTotalePeridoL: row.pu_acquaTotalePeridoL
              ? parseFloat(row.pu_acquaTotalePeridoL)
              : undefined,
            fieldAllocations: [],
          });
        }

        // Aggiungi l'allocazione del campo alla production unit
        const pu = productionUnitsMap.get(puName)!;
        const areaHa = row.pu_areaHa ? parseFloat(row.pu_areaHa) : 0;
        if (areaHa > 0) {
          pu.fieldAllocations.push({
            fieldName: row.pu_fieldName || fieldName,
            sezione: row.pu_sezione || row.sezione,
            foglio: row.pu_foglio || row.foglio,
            particella: row.pu_particella || row.particella,
            subalterno: row.pu_subalterno || row.subalterno,
            areaHa,
          });
        }
      }
    });

    // Converti le mappe in array
    const fields = Array.from(fieldsMap.values()).map((field) => {
      // Rimuovi companyName e vatNumber dalle proprietà del campo
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { companyName, vatNumber, ...fieldData } = field;
      return fieldData;
    });

    const productionUnits = Array.from(productionUnitsMap.values());

    results.push({
      companyName: group.companyName,
      vatNumber: group.vatNumber,
      fields,
      productionUnits,
    });
  });

  return results;
}

// Funzione per validare i dati parsati
export function validateParsedData(data: ParsedBulkImport[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (data.length === 0) {
    errors.push("Nessun dato trovato nel file CSV");
    return { isValid: false, errors };
  }

  data.forEach((company, index) => {
    if (!company.companyName || company.companyName.trim() === "") {
      errors.push(`Riga ${index + 1}: Nome azienda mancante`);
    }

    if (!company.vatNumber || company.vatNumber.trim() === "") {
      errors.push(`Riga ${index + 1}: Partita IVA mancante`);
    }

    if (company.fields.length === 0) {
      errors.push(`Azienda "${company.companyName}": Nessun campo trovato`);
    }

    if (company.productionUnits.length === 0) {
      errors.push(
        `Azienda "${company.companyName}": Nessuna unità produttiva trovata`
      );
    }

    company.fields.forEach((field, fieldIndex) => {
      if (!field.name || field.name.trim() === "") {
        errors.push(
          `Azienda "${company.companyName}", Campo ${
            fieldIndex + 1
          }: Nome campo mancante`
        );
      }
    });

    company.productionUnits.forEach((pu, puIndex) => {
      if (!pu.name || pu.name.trim() === "") {
        errors.push(
          `Azienda "${company.companyName}", Unità Produttiva ${
            puIndex + 1
          }: Nome mancante`
        );
      }

      if (!pu.cropName || pu.cropName.trim() === "") {
        errors.push(
          `Azienda "${company.companyName}", Unità Produttiva "${pu.name}": Nome coltura mancante`
        );
      }

      if (pu.fieldAllocations.length === 0) {
        errors.push(
          `Azienda "${company.companyName}", Unità Produttiva "${pu.name}": Nessuna allocazione campo trovata`
        );
      }

      pu.fieldAllocations.forEach((alloc, allocIndex) => {
        if (!alloc.fieldName || alloc.fieldName.trim() === "") {
          errors.push(
            `Azienda "${company.companyName}", Unità Produttiva "${
              pu.name
            }", Allocazione ${allocIndex + 1}: Nome campo mancante`
          );
        }

        if (!alloc.areaHa || alloc.areaHa <= 0) {
          errors.push(
            `Azienda "${company.companyName}", Unità Produttiva "${
              pu.name
            }", Allocazione ${allocIndex + 1}: Area non valida`
          );
        }
      });
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
