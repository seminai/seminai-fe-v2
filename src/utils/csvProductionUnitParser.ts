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
  startDate: string; // ISO format
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
export function parseProductionUnitCSV(csvText: string): ParsedBulkImport[] {
  const rows = parseCSV(csvText);

  console.log("🔍 CSV Parser - Righe parsate:", rows.length);
  if (rows.length > 0) {
    console.log("🔍 CSV Parser - Prima riga:", rows[0]);
    console.log("🔍 CSV Parser - Headers disponibili:", Object.keys(rows[0]));
  }

  if (rows.length === 0) {
    throw new Error("Il file CSV è vuoto o non valido");
  }

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
