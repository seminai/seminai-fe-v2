import { type BulkFieldInput } from "@/api/fields";
import { type Company } from "@/api/companies";
import * as XLSX from "xlsx";

/**
 * CsvFieldMapper - Classe per gestire il parsing e il mapping dei CSV per i campi
 * Segue i principi OOP con incapsulamento della logica di parsing
 */
export class CsvFieldMapper {
  private companies: Company[];
  private companyNameMap: Map<string, string>;

  constructor(companies: Company[]) {
    this.companies = companies;
    this.companyNameMap = this.buildCompanyNameMap();
  }

  /**
   * Costruisce una mappa nome azienda -> ID azienda (case-insensitive)
   */
  private buildCompanyNameMap(): Map<string, string> {
    const map = new Map<string, string>();
    this.companies.forEach((company) => {
      map.set(company.name.toLowerCase().trim(), company.id);
    });
    return map;
  }

  /**
   * Trova l'ID dell'azienda dato il nome (case-insensitive)
   */
  private findCompanyId(companyName: string): string | undefined {
    const normalizedName = companyName.toLowerCase().trim();
    return this.companyNameMap.get(normalizedName);
  }

  /**
   * Normalizza i nomi delle colonne del CSV (rimuove spazi, converte in camelCase)
   */
  private normalizeColumnName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, "").replace(/_/g, "");
  }

  /**
   * Mappa le colonne CSV ai campi richiesti
   */
  private mapColumnAliases(columnName: string): string {
    const normalized = this.normalizeColumnName(columnName);
    const aliases: Record<string, string> = {
      azienda: "companyName",
      nomeazienda: "companyName",
      company: "companyName",
      nome: "name",
      nomecampo: "name",
      fieldname: "name",
      indirizzo: "address",
      via: "address",
      address: "address",
      sezione: "sezione",
      section: "sezione",
      foglio: "foglio",
      sheet: "foglio",
      particella: "particella",
      parcel: "particella",
      mappale: "particella",
      superficiecatastalemq: "superficieCatastaleMq",
      superficiemq: "superficieCatastaleMq",
      supcat: "superficieCatastaleMq",
      area: "superficieCatastaleMq",
      superficiecatastale: "superficieCatastaleMq",
      città: "city",
      citta: "city",
      city: "city",
      comune: "city",
      sauha: "sauHa",
      sau: "sauHa",
      uso: "uso",
      use: "uso",
      utilizzo: "uso",
      tiposuolo: "soilType",
      soiltype: "soilType",
      soil: "soilType",
      suolo: "soilType",
      cap: "cap",
      postalcode: "cap",
      regione: "region",
      region: "region",
      provincia: "province",
      province: "province",
      prov: "province",
      subalterno: "subalterno",
      cuaa: "cuaa",
      codicefiscaleazienda: "cuaa",
      superficiegismq: "gisHa",
      superficiegis: "gisHa",
      gismq: "gisHa",
      superficiecondottamq: "superficieCondottaMq",
      superficiecondotta: "superficieCondottaMq",
      condottamq: "superficieCondottaMq",
      qualita: "qualita",
      quality: "qualita",
      ph: "ph",
      azoto: "nitrogen",
      nitrogen: "nitrogen",
      n: "nitrogen",
      fosforo: "phosphorus",
      phosphorus: "phosphorus",
      p: "phosphorus",
      potassio: "potassium",
      potassium: "potassium",
      k: "potassium",
      calcio: "calcium",
      calcium: "calcium",
      ca: "calcium",
      magnesio: "magnesium",
      magnesium: "magnesium",
      mg: "magnesium",
      inizioconduzione: "inizioConduzione",
      startdate: "inizioConduzione",
      fineconduzione: "fineConduzione",
      enddate: "fineConduzione",
      // Nuovi alias per il template AGEA/SIAN
      unitaproduttiva: "name",
      comunedescrizione: "city",
      superficieagricola: "sauHa",
      superficiegrafica: "gisHa",
      usousosuoloprimario: "uso",
      qualitausosuoloprimario: "qualita",
      superficieusosuoloprimario: "superficieUsoSuoloPrimario",
    };

    return aliases[normalized] || normalized;
  }

  /**
   * Converte un valore in numero se possibile
   * Gestisce sia il punto che la virgola come separatore decimale
   */
  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;

    let stringValue = String(value).trim();

    // Sostituisce la virgola con il punto per i numeri decimali (formato italiano)
    stringValue = stringValue.replace(",", ".");

    const num = Number(stringValue);
    return isNaN(num) ? null : num;
  }

  /**
   * Converte metri quadrati in ettari
   */
  private convertMqToHa(mq: number): number {
    return mq / 10000;
  }

  /**
   * Valida che un record abbia tutti i campi obbligatori
   * Ora restituisce warnings invece di errori bloccanti
   */
  private validateRecord(
    record: Record<string, unknown>,
    lineNumber: number,
    targetCompanyId?: string
  ): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (!targetCompanyId && !record.companyName) {
      warnings.push(`Riga ${lineNumber}: Nome azienda mancante`);
    }

    if (!record.name) {
      warnings.push(`Riga ${lineNumber}: Nome campo mancante`);
    }

    // Validazione indirizzo: se non c'è l'indirizzo ma c'è la città, va bene (useremo la città come indirizzo)
    if (!record.address && !record.city) {
      warnings.push(`Riga ${lineNumber}: Indirizzo o Città mancante`);
    }

    // if (!record.sezione) {
    //   warnings.push(`Riga ${lineNumber}: Sezione mancante`);
    // }

    if (!record.foglio) {
      warnings.push(`Riga ${lineNumber}: Foglio mancante`);
    }

    if (!record.particella) {
      warnings.push(`Riga ${lineNumber}: Particella mancante`);
    }

    if (!record.superficieCatastaleMq) {
      warnings.push(`Riga ${lineNumber}: Superficie catastale mancante`);
    }

    return {
      valid: true, // Sempre valido, le validazioni sono gestite dalla tabella
      warnings,
    };
  }

  /**
   * Converte un record CSV in un BulkFieldInput
   * Permette l'importazione anche con dati incompleti
   */
  private mapRecordToField(
    record: Record<string, unknown>,
    lineNumber: number,
    targetCompanyId?: string
  ): { field: BulkFieldInput | null; warnings: string[] } {
    const validation = this.validateRecord(record, lineNumber, targetCompanyId);
    const warnings: string[] = [...validation.warnings];

    let companyId = targetCompanyId;
    let companyName = "";

    if (!companyId) {
      companyName = String(record.companyName || "");
      companyId = this.findCompanyId(companyName);

      // Se l'azienda non è trovata, aggiungi un warning ma non bloccare l'importazione
      if (!companyId && companyName) {
        warnings.push(
          `Riga ${lineNumber}: Azienda "${companyName}" non trovata. Seleziona l'azienda corretta nella tabella.`
        );
      }
    }

    // Gestione indirizzo: se manca, usa la città o un placeholder
    let address = String(record.address || "");
    const city = String(record.city || "");

    if (!address && city) {
      address = city;
    } else if (!address) {
      address = "Indirizzo non disponibile";
    }

    const field: BulkFieldInput = {
      companyId: companyId || "", // Usa stringa vuota se non trovato
      name: String(record.name || ""),
      address: address,
      sezione: String(record.sezione || ""),
      foglio: String(record.foglio || ""),
      particella: String(record.particella || ""),
      superficieCatastaleMq: Number(record.superficieCatastaleMq || 0),
    };

    // Campi opzionali
    if (city) field.city = city;

    // SAU: se presente, converti da mq a ettari se necessario (simile a GIS)
    // Fallback: se SAU è vuoto o 0, prova a prendere Superficie Uso Suolo Primario
    let sauValue = this.parseNumber(record.sauHa);
    const superficieUsoSuoloPrimario = this.parseNumber(
      record.superficieUsoSuoloPrimario
    );

    if ((!sauValue || sauValue === 0) && superficieUsoSuoloPrimario) {
      sauValue = superficieUsoSuoloPrimario;
    }

    if (sauValue !== null && sauValue > 0) {
      // Se il valore è molto grande (> 100), probabilmente è in mq e va convertito
      field.sauHa = sauValue > 100 ? this.convertMqToHa(sauValue) : sauValue;
    }

    if (record.uso) field.uso = String(record.uso);
    if (record.soilType) field.soilType = String(record.soilType);
    if (record.cap) field.cap = String(record.cap);
    if (record.region) field.region = String(record.region);
    if (record.subalterno) field.subalterno = String(record.subalterno);
    if (record.qualita) field.qualita = String(record.qualita);
    if (record.ph) field.ph = this.parseNumber(record.ph);
    if (record.nitrogen) field.nitrogen = this.parseNumber(record.nitrogen);
    if (record.phosphorus)
      field.phosphorus = this.parseNumber(record.phosphorus);
    if (record.potassium) field.potassium = this.parseNumber(record.potassium);
    if (record.calcium) field.calcium = this.parseNumber(record.calcium);
    if (record.magnesium) field.magnesium = this.parseNumber(record.magnesium);
    if (record.inizioConduzione)
      field.inizioConduzione = String(record.inizioConduzione);
    if (record.fineConduzione)
      field.fineConduzione = String(record.fineConduzione);

    // Nuovi campi opzionali dal CSV aggiornato
    if (record.province) field.province = String(record.province);
    if (record.cuaa) field.cuaa = String(record.cuaa);

    // GIS: se presente, converti da mq a ettari se necessario
    if (record.gisHa) {
      const gisValue = this.parseNumber(record.gisHa);
      if (gisValue !== null) {
        // Se il valore è molto grande, probabilmente è in mq e va convertito
        field.gisHa = gisValue > 100 ? this.convertMqToHa(gisValue) : gisValue;
      }
    }

    // Superficie condotta (salviamo in variazioneMq come campo testuale)
    if (record.superficieCondottaMq) {
      const superficieCondotta = this.parseNumber(record.superficieCondottaMq);
      if (superficieCondotta !== null) {
        field.variazioneMq = String(superficieCondotta);
      }
    }

    return { field, warnings };
  }

  /**
   * Parsa un file CSV e restituisce i campi mappati
   */
  public parseFile(
    file: File,
    targetCompanyId?: string
  ): Promise<{
    fields: BulkFieldInput[];
    errors: string[];
    warnings: string[];
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error("Impossibile leggere il file"));
            return;
          }

          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Converti in JSON
          const rawData = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
          }) as Record<string, unknown>[];

          if (rawData.length === 0) {
            resolve({
              fields: [],
              errors: ["Il file CSV è vuoto"],
              warnings: [],
            });
            return;
          }

          // Mappa le colonne
          const mappedData = rawData.map((row) => {
            const mappedRow: Record<string, unknown> = {};
            Object.keys(row).forEach((key) => {
              const mappedKey = this.mapColumnAliases(key);
              mappedRow[mappedKey] = row[key];
            });
            return mappedRow;
          });

          // Converti i record in campi
          const fields: BulkFieldInput[] = [];
          const errors: string[] = [];
          const warnings: string[] = [];

          mappedData.forEach((record, index) => {
            const lineNumber = index + 2; // +2 perché la riga 1 è l'header
            const result = this.mapRecordToField(
              record,
              lineNumber,
              targetCompanyId
            );

            // Importa sempre il campo, anche se ha warnings
            if (result.field) {
              fields.push(result.field);
            }

            if (result.warnings.length > 0) {
              warnings.push(...result.warnings);
            }
          });

          resolve({ fields, errors, warnings });
        } catch (error) {
          reject(
            new Error(
              `Errore nel parsing del CSV: ${
                error instanceof Error ? error.message : "Errore sconosciuto"
              }`
            )
          );
        }
      };

      reader.onerror = () => {
        reject(new Error("Errore nella lettura del file"));
      };

      reader.readAsBinaryString(file);
    });
  }
}
