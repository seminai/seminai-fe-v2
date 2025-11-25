import type { CropVariety, CultivarHarvestRecord } from "../types";

class CultivarCatalog {
  private static readonly MONTH_MAP: Record<string, number> = {
    gen: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    mag: 4,
    giu: 5,
    lug: 6,
    ago: 7,
    set: 8,
    sett: 8,
    ott: 9,
    nov: 10,
    dic: 11,
  };

  private readonly records: CultivarHarvestRecord[];
  private readonly recordById: Map<string, CultivarHarvestRecord>;

  private constructor(records: CultivarHarvestRecord[]) {
    this.records = [...records].sort((a, b) => {
      const speciesComparison = a.species.localeCompare(b.species);
      if (speciesComparison !== 0) {
        return speciesComparison;
      }
      return a.cultivar.localeCompare(b.cultivar);
    });
    this.recordById = new Map(
      this.records.map((record) => [record.id, record])
    );
  }

  public static fromCsv(csvText: string): CultivarCatalog {
    if (!csvText) {
      return new CultivarCatalog([]);
    }

    const sanitizedText = csvText.replace(/\r/g, "\n");
    const lines = sanitizedText.split("\n");

    if (lines.length <= 1) {
      return new CultivarCatalog([]);
    }

    const dataLines = lines.slice(1);
    const parsedRecords: CultivarHarvestRecord[] = [];
    const seenIds = new Set<string>();

    dataLines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        return;
      }

      const cells = line.split(";");
      if (cells.length < 4) {
        return;
      }

      const species = CultivarCatalog.sanitizeCell(cells[0]);
      const cultivar = CultivarCatalog.sanitizeCell(cells[1]);
      const offsetDays = CultivarCatalog.parseNumberCell(cells[2]);
      const harvestLabel = CultivarCatalog.sanitizeCell(cells[3]);

      if (!species || !cultivar || !harvestLabel) {
        return;
      }

      const id = CultivarCatalog.buildId(species, cultivar);
      if (seenIds.has(id)) {
        return;
      }
      seenIds.add(id);

      parsedRecords.push({
        id,
        species,
        cultivar,
        offsetDays,
        harvestLabel,
      });
    });

    return new CultivarCatalog(parsedRecords);
  }

  public getCultivarsForCrop(
    crop: CropVariety | null | undefined
  ): CultivarHarvestRecord[] {
    if (!crop) {
      return [];
    }

    return this.records.filter((record) =>
      CultivarCatalog.matchesCrop(record, crop)
    );
  }

  public findById(id: string | null | undefined): CultivarHarvestRecord | null {
    if (!id) {
      return null;
    }
    return this.recordById.get(id) ?? null;
  }

  public getCultivarName(id: string | null | undefined): string | null {
    return this.findById(id)?.cultivar ?? null;
  }

  public getCultivarLabel(id: string | null | undefined): string | null {
    const record = this.findById(id);
    if (!record) {
      return null;
    }
    return `${record.cultivar} (${record.species})`;
  }

  public getReferenceLabel(id: string | null | undefined): string | null {
    return this.findById(id)?.harvestLabel ?? null;
  }

  public getRecommendedHarvestDate(
    id: string | null | undefined,
    startDate: Date
  ): Date | null {
    const record = this.findById(id);
    if (!record) {
      return null;
    }
    return CultivarCatalog.computeHarvestDate(record, startDate);
  }

  private static computeHarvestDate(
    record: CultivarHarvestRecord,
    startDate: Date
  ): Date | null {
    const baseDate = CultivarCatalog.parseHarvestLabel(
      record.harvestLabel,
      startDate.getFullYear()
    );
    if (!baseDate) {
      return null;
    }
    if (baseDate < startDate) {
      const shifted = new Date(baseDate);
      shifted.setFullYear(shifted.getFullYear() + 1);
      return shifted;
    }
    return baseDate;
  }

  private static parseHarvestLabel(
    label: string,
    referenceYear: number
  ): Date | null {
    if (!label) {
      return null;
    }

    const normalized = label.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const parts = normalized.split("-");
    if (parts.length !== 2) {
      return null;
    }

    const day = Number.parseInt(parts[0] ?? "", 10);
    if (Number.isNaN(day) || day < 1 || day > 31) {
      return null;
    }

    const monthToken = parts[1] ?? "";
    const monthIndex = CultivarCatalog.resolveMonthIndex(monthToken);
    if (monthIndex === null) {
      return null;
    }

    return new Date(referenceYear, monthIndex, day);
  }

  private static resolveMonthIndex(token: string): number | null {
    const normalized = token.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        CultivarCatalog.MONTH_MAP,
        normalized
      )
    ) {
      return CultivarCatalog.MONTH_MAP[normalized];
    }

    const numericMonth = Number.parseInt(normalized, 10);
    if (!Number.isNaN(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
      return numericMonth - 1;
    }

    return null;
  }

  private static matchesCrop(
    record: CultivarHarvestRecord,
    crop: CropVariety
  ): boolean {
    const recordAliases = new Set<string>([
      CultivarCatalog.normalize(record.species),
      ...CultivarCatalog.buildTokens(record.species),
    ].filter((value) => value.length > 0));

    if (recordAliases.size === 0) {
      return false;
    }

    const cropAliases = new Set<string>([
      CultivarCatalog.normalize(crop.species),
      CultivarCatalog.normalize(crop.cropType),
      CultivarCatalog.normalize(crop.code),
      ...CultivarCatalog.buildTokens(crop.species),
      ...CultivarCatalog.buildTokens(crop.cropType),
      ...CultivarCatalog.buildTokens(crop.code),
    ].filter((value) => value.length > 0));

    if (cropAliases.size === 0) {
      return false;
    }

    for (const recordAlias of recordAliases) {
      for (const cropAlias of cropAliases) {
        if (
          recordAlias === cropAlias ||
          recordAlias.startsWith(cropAlias) ||
          cropAlias.startsWith(recordAlias)
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private static sanitizeCell(value: string | undefined): string {
    if (!value) {
      return "";
    }
    return value.replace(/^\uFEFF/, "").trim();
  }

  private static parseNumberCell(value: string | undefined): number | null {
    const sanitized = CultivarCatalog.sanitizeCell(value);
    if (!sanitized) {
      return null;
    }
    const parsed = Number.parseInt(sanitized, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private static normalize(value: string | null | undefined): string {
    if (!value) {
      return "";
    }
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  private static buildTokens(value: string | null | undefined): string[] {
    if (!value) {
      return [];
    }
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
  }

  private static buildId(species: string, cultivar: string): string {
    return `${CultivarCatalog.normalize(species)}::${CultivarCatalog.normalize(
      cultivar
    )}`;
  }
}

export { CultivarCatalog };

