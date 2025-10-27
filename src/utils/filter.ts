/**
 * Sistema di filtro astratto e riutilizzabile
 * Seguendo i principi della Programmazione Orientata agli Oggetti (OOP)
 */

/**
 * Tipo di operatore per i filtri
 */
export type FilterOperator =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"
  | "notIn"
  | "isEmpty"
  | "isNotEmpty";

/**
 * Modalità di combinazione dei filtri
 */
export type FilterMode = "AND" | "OR";

/**
 * Configurazione di un singolo filtro
 */
export interface FilterConfig<T = unknown> {
  field: keyof T | string;
  operator: FilterOperator;
  value?: unknown;
  caseSensitive?: boolean;
}

/**
 * Opzioni per il DataFilter
 */
export interface DataFilterOptions {
  mode?: FilterMode;
  caseSensitive?: boolean;
}

/**
 * Classe base astratta per il filtro dati
 * Implementa pattern Strategy per diversi tipi di filtro
 */
export abstract class BaseFilter<T> {
  protected filters: FilterConfig<T>[] = [];
  protected mode: FilterMode = "AND";
  protected caseSensitive: boolean = false;

  constructor(options?: DataFilterOptions) {
    if (options?.mode) this.mode = options.mode;
    if (options?.caseSensitive !== undefined)
      this.caseSensitive = options.caseSensitive;
  }

  /**
   * Aggiunge un filtro alla configurazione
   */
  public addFilter(filter: FilterConfig<T>): this {
    this.filters.push(filter);
    return this;
  }

  /**
   * Rimuove tutti i filtri
   */
  public clearFilters(): this {
    this.filters = [];
    return this;
  }

  /**
   * Imposta la modalità di combinazione
   */
  public setMode(mode: FilterMode): this {
    this.mode = mode;
    return this;
  }

  /**
   * Filtra un array di dati
   */
  public abstract filter(data: T[]): T[];

  /**
   * Verifica se un singolo item passa i filtri
   */
  protected abstract matchesFilters(item: T): boolean;
}

/**
 * Implementazione concreta del filtro dati
 * Supporta vari operatori e modalità di filtro
 */
export class DataFilter<T> extends BaseFilter<T> {
  /**
   * Filtra un array di dati applicando tutti i filtri configurati
   */
  public filter(data: T[]): T[] {
    if (this.filters.length === 0) return data;
    return data.filter((item) => this.matchesFilters(item));
  }

  /**
   * Verifica se un item soddisfa tutti i filtri (AND) o almeno uno (OR)
   */
  protected matchesFilters(item: T): boolean {
    if (this.filters.length === 0) return true;

    if (this.mode === "AND") {
      return this.filters.every((filter) => this.matchFilter(item, filter));
    } else {
      return this.filters.some((filter) => this.matchFilter(item, filter));
    }
  }

  /**
   * Verifica se un item soddisfa un singolo filtro
   */
  private matchFilter(item: T, filter: FilterConfig<T>): boolean {
    const value = this.getFieldValue(item, filter.field as string);
    const caseSensitive =
      filter.caseSensitive !== undefined
        ? filter.caseSensitive
        : this.caseSensitive;

    switch (filter.operator) {
      case "equals":
        return this.compareEquals(value, filter.value, caseSensitive);

      case "contains":
        return this.compareContains(value, filter.value, caseSensitive);

      case "startsWith":
        return this.compareStartsWith(value, filter.value, caseSensitive);

      case "endsWith":
        return this.compareEndsWith(value, filter.value, caseSensitive);

      case "gt":
        return this.compareGreaterThan(value, filter.value);

      case "gte":
        return this.compareGreaterThanOrEqual(value, filter.value);

      case "lt":
        return this.compareLessThan(value, filter.value);

      case "lte":
        return this.compareLessThanOrEqual(value, filter.value);

      case "between":
        return this.compareBetween(value, filter.value);

      case "in":
        return this.compareIn(value, filter.value);

      case "notIn":
        return !this.compareIn(value, filter.value);

      case "isEmpty":
        return this.isEmpty(value);

      case "isNotEmpty":
        return !this.isEmpty(value);

      default:
        return false;
    }
  }

  /**
   * Ottiene il valore di un campo da un oggetto (supporta nested paths)
   */
  private getFieldValue(item: T, field: string): unknown {
    const fields = field.split(".");
    let value: unknown = item;

    for (const f of fields) {
      if (value && typeof value === "object" && f in value) {
        value = (value as Record<string, unknown>)[f];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Normalizza una stringa per il confronto (case-insensitive)
   */
  private normalizeString(value: unknown, caseSensitive: boolean): string {
    const str = String(value ?? "");
    return caseSensitive ? str : str.toLowerCase();
  }

  // Operatori di confronto

  private compareEquals(
    value: unknown,
    target: unknown,
    caseSensitive: boolean
  ): boolean {
    if (typeof value === "string" && typeof target === "string") {
      return (
        this.normalizeString(value, caseSensitive) ===
        this.normalizeString(target, caseSensitive)
      );
    }
    return value === target;
  }

  private compareContains(
    value: unknown,
    target: unknown,
    caseSensitive: boolean
  ): boolean {
    const str = this.normalizeString(value, caseSensitive);
    const search = this.normalizeString(target, caseSensitive);
    return str.includes(search);
  }

  private compareStartsWith(
    value: unknown,
    target: unknown,
    caseSensitive: boolean
  ): boolean {
    const str = this.normalizeString(value, caseSensitive);
    const search = this.normalizeString(target, caseSensitive);
    return str.startsWith(search);
  }

  private compareEndsWith(
    value: unknown,
    target: unknown,
    caseSensitive: boolean
  ): boolean {
    const str = this.normalizeString(value, caseSensitive);
    const search = this.normalizeString(target, caseSensitive);
    return str.endsWith(search);
  }

  private compareGreaterThan(value: unknown, target: unknown): boolean {
    return Number(value) > Number(target);
  }

  private compareGreaterThanOrEqual(value: unknown, target: unknown): boolean {
    return Number(value) >= Number(target);
  }

  private compareLessThan(value: unknown, target: unknown): boolean {
    return Number(value) < Number(target);
  }

  private compareLessThanOrEqual(value: unknown, target: unknown): boolean {
    return Number(value) <= Number(target);
  }

  private compareBetween(value: unknown, range: unknown): boolean {
    if (!Array.isArray(range) || range.length !== 2) return false;
    const numValue = Number(value);
    return numValue >= Number(range[0]) && numValue <= Number(range[1]);
  }

  private compareIn(value: unknown, list: unknown): boolean {
    if (!Array.isArray(list)) return false;
    return list.includes(value);
  }

  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }
}

/**
 * Builder per creare filtri in modo fluente
 * Pattern Fluent Interface per migliorare la leggibilità
 */
export class FilterBuilder<T> {
  private filter: DataFilter<T>;

  constructor(options?: DataFilterOptions) {
    this.filter = new DataFilter<T>(options);
  }

  /**
   * Filtra dove il campo è uguale al valore
   */
  public whereEquals(field: keyof T | string, value: unknown): this {
    this.filter.addFilter({ field, operator: "equals", value });
    return this;
  }

  /**
   * Filtra dove il campo contiene il valore
   */
  public whereContains(
    field: keyof T | string,
    value: unknown,
    caseSensitive = false
  ): this {
    this.filter.addFilter({
      field,
      operator: "contains",
      value,
      caseSensitive,
    });
    return this;
  }

  /**
   * Filtra dove il campo inizia con il valore
   */
  public whereStartsWith(
    field: keyof T | string,
    value: unknown,
    caseSensitive = false
  ): this {
    this.filter.addFilter({
      field,
      operator: "startsWith",
      value,
      caseSensitive,
    });
    return this;
  }

  /**
   * Filtra dove il campo finisce con il valore
   */
  public whereEndsWith(
    field: keyof T | string,
    value: unknown,
    caseSensitive = false
  ): this {
    this.filter.addFilter({
      field,
      operator: "endsWith",
      value,
      caseSensitive,
    });
    return this;
  }

  /**
   * Filtra dove il campo è maggiore del valore
   */
  public whereGreaterThan(field: keyof T | string, value: number): this {
    this.filter.addFilter({ field, operator: "gt", value });
    return this;
  }

  /**
   * Filtra dove il campo è maggiore o uguale al valore
   */
  public whereGreaterThanOrEqual(field: keyof T | string, value: number): this {
    this.filter.addFilter({ field, operator: "gte", value });
    return this;
  }

  /**
   * Filtra dove il campo è minore del valore
   */
  public whereLessThan(field: keyof T | string, value: number): this {
    this.filter.addFilter({ field, operator: "lt", value });
    return this;
  }

  /**
   * Filtra dove il campo è minore o uguale al valore
   */
  public whereLessThanOrEqual(field: keyof T | string, value: number): this {
    this.filter.addFilter({ field, operator: "lte", value });
    return this;
  }

  /**
   * Filtra dove il campo è tra due valori
   */
  public whereBetween(field: keyof T | string, min: number, max: number): this {
    this.filter.addFilter({ field, operator: "between", value: [min, max] });
    return this;
  }

  /**
   * Filtra dove il campo è in una lista di valori
   */
  public whereIn(field: keyof T | string, values: unknown[]): this {
    this.filter.addFilter({ field, operator: "in", value: values });
    return this;
  }

  /**
   * Filtra dove il campo non è in una lista di valori
   */
  public whereNotIn(field: keyof T | string, values: unknown[]): this {
    this.filter.addFilter({ field, operator: "notIn", value: values });
    return this;
  }

  /**
   * Filtra dove il campo è vuoto
   */
  public whereEmpty(field: keyof T | string): this {
    this.filter.addFilter({ field, operator: "isEmpty" });
    return this;
  }

  /**
   * Filtra dove il campo non è vuoto
   */
  public whereNotEmpty(field: keyof T | string): this {
    this.filter.addFilter({ field, operator: "isNotEmpty" });
    return this;
  }

  /**
   * Imposta la modalità di combinazione (AND/OR)
   */
  public withMode(mode: FilterMode): this {
    this.filter.setMode(mode);
    return this;
  }

  /**
   * Costruisce e restituisce il filtro
   */
  public build(): DataFilter<T> {
    return this.filter;
  }

  /**
   * Applica direttamente il filtro ai dati
   */
  public apply(data: T[]): T[] {
    return this.filter.filter(data);
  }
}

/**
 * Filtro di ricerca testuale multi-campo
 * Utile per implementare barre di ricerca
 */
export class TextSearchFilter<T> {
  private searchTerm: string = "";
  private searchFields: Array<keyof T | string> = [];
  private caseSensitive: boolean = false;

  constructor(
    fields: Array<keyof T | string>,
    options?: { caseSensitive?: boolean }
  ) {
    this.searchFields = fields;
    if (options?.caseSensitive !== undefined) {
      this.caseSensitive = options.caseSensitive;
    }
  }

  /**
   * Imposta il termine di ricerca
   */
  public setSearchTerm(term: string): this {
    this.searchTerm = term;
    return this;
  }

  /**
   * Filtra i dati cercando il termine in tutti i campi specificati
   */
  public filter(data: T[]): T[] {
    if (!this.searchTerm.trim()) return data;

    const searchLower = this.caseSensitive
      ? this.searchTerm
      : this.searchTerm.toLowerCase();

    return data.filter((item) => {
      return this.searchFields.some((field) => {
        const value = this.getFieldValue(item, field as string);
        const valueStr = this.caseSensitive
          ? String(value ?? "")
          : String(value ?? "").toLowerCase();
        return valueStr.includes(searchLower);
      });
    });
  }

  private getFieldValue(item: T, field: string): unknown {
    const fields = field.split(".");
    let value: unknown = item;

    for (const f of fields) {
      if (value && typeof value === "object" && f in value) {
        value = (value as Record<string, unknown>)[f];
      } else {
        return undefined;
      }
    }

    return value;
  }
}

/**
 * Helper per creare un filtro rapidamente
 */
export function createFilter<T>(options?: DataFilterOptions): FilterBuilder<T> {
  return new FilterBuilder<T>(options);
}

/**
 * Helper per creare un filtro di ricerca testuale
 */
export function createTextSearch<T>(
  fields: Array<keyof T | string>,
  options?: { caseSensitive?: boolean }
): TextSearchFilter<T> {
  return new TextSearchFilter<T>(fields, options);
}
