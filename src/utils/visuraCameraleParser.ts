/**
 * Parser per estrarre dati da visure camerali
 * Estrae informazioni aziendali da testo OCR/PDF
 */

export interface ParsedCompanyData {
  name: string;
  vatNumber: string;
  fiscalCode: string;
  address?: string;
  city?: string;
  cap?: string;
  email?: string;
  nation?: string;
}

export class VisuraCameraleParser {
  /**
   * Estrae il nome dell'azienda dal testo
   */
  private static extractCompanyName(text: string): string {
    // Pattern per trovare il nome dell'azienda
    // Cerca dopo "Registro Imprese" o "VISURA" e prima di "DATI ANAGRAFICI" o "Codice fiscale"
    const patterns = [
      /VISURA DI EVASIONE\s+(.*?)\s+DATI ANAGRAFICI/is,
      /Registro Imprese[^\n]*\n\s*(.*?)\s+Codice fiscale/is,
      /Documento n[^\n]*\n\s*(.*?)\s+Codice Fiscale/is,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/\s+/g, " ");
      }
    }

    return "";
  }

  /**
   * Estrae la Partita IVA
   */
  private static extractVatNumber(text: string): string {
    const patterns = [
      /Partita IVA[:\s]+(\d{11})/i,
      /P\.IVA[:\s]+(\d{11})/i,
      /partita iva[:\s]+(\d{11})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return "";
  }

  /**
   * Estrae il Codice Fiscale
   */
  private static extractFiscalCode(text: string): string {
    const patterns = [
      /Codice fiscale[:\s]+([A-Z0-9]{11,16})/i,
      /C\.F\.[:\s]+([A-Z0-9]{11,16})/i,
      /codice fiscale[:\s]+([A-Z0-9]{11,16})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }

    return "";
  }

  /**
   * Estrae l'indirizzo della sede legale
   */
  private static extractAddress(text: string): {
    address: string;
    city: string;
    cap: string;
  } {
    // Pattern per sede legale: CITTA (PROV) INDIRIZZO CAP numero
    const pattern1 =
      /Sede [Ll]egale[:\s]+([A-Z\s]+)\s*\(([A-Z]{2})\)\s+(VIA|VIALE|PIAZZA|CORSO|STRADA|LOCALITÀ|LOC\.)[^\n]+CAP\s*(\d{5})/i;
    const match1 = text.match(pattern1);

    if (match1) {
      const fullMatch = match1[0];
      const city = match1[1].trim();
      const addressPart = fullMatch.match(
        /(VIA|VIALE|PIAZZA|CORSO|STRADA|LOCALITÀ|LOC\.)[^\n]+?(?=CAP)/i
      );
      const address = addressPart
        ? addressPart[0].replace(/CAP.*/, "").trim()
        : "";
      const cap = match1[4];

      return { address, city, cap };
    }

    // Pattern alternativo
    const pattern2 =
      /Indirizzo Sede legale[:\s]+([A-Z\s]+)\s*\(([A-Z]{2})\)\s+([^\n]+?)CAP\s*(\d{5})/i;
    const match2 = text.match(pattern2);

    if (match2) {
      return {
        city: match2[1].trim(),
        address: match2[3].trim(),
        cap: match2[4],
      };
    }

    // Prova a estrarre separatamente
    const cityMatch = text.match(/Sede legale[:\s]+([A-Z\s]+)\s*\([A-Z]{2}\)/i);
    const addressMatch = text.match(
      /(VIA|VIALE|PIAZZA|CORSO|STRADA)\s+[^\n]+/i
    );
    const capMatch = text.match(/CAP\s*(\d{5})/i);

    return {
      city: cityMatch ? cityMatch[1].trim() : "",
      address: addressMatch ? addressMatch[0].trim() : "",
      cap: capMatch ? capMatch[1] : "",
    };
  }

  /**
   * Estrae l'email/PEC
   */
  private static extractEmail(text: string): string {
    const patterns = [
      /Indirizzo PEC[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /PEC[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /posta elettronica certificata[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /e-?mail[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }

    return "";
  }

  /**
   * Funzione principale per parsare il testo della visura
   */
  public static parse(text: string): ParsedCompanyData {
    const name = this.extractCompanyName(text);
    const vatNumber = this.extractVatNumber(text);
    const fiscalCode = this.extractFiscalCode(text);
    const { address, city, cap } = this.extractAddress(text);
    const email = this.extractEmail(text);

    return {
      name,
      vatNumber,
      fiscalCode,
      address: address || undefined,
      city: city || undefined,
      cap: cap || undefined,
      email: email || undefined,
      nation: "IT", // Default per visure camerali italiane
    };
  }

  /**
   * Valida i dati estratti
   */
  public static validate(data: ParsedCompanyData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.name || data.name.length < 3) {
      errors.push("Nome azienda non trovato o non valido");
    }

    if (!data.fiscalCode || data.fiscalCode.length < 11) {
      errors.push("Codice fiscale non trovato o non valido");
    }

    if (!data.vatNumber || data.vatNumber.length !== 11) {
      errors.push("Partita IVA non trovata o non valida");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
