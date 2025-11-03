import {
  EditableCellType,
  EditableColumn,
} from "@/components/organism/EditableTable";

export function buildColumns<T>(
  config: Array<{
    id: keyof T;
    title: string;
    type?: "text" | "number" | "select" | "date" | "currency";
    width?: string;
    required?: boolean;
    render?: (value: unknown, row: T) => React.ReactNode;
  }>
): EditableColumn[] {
  return config.map((c) => ({
    id: String(c.id),
    title: c.title,
    type: c.type,
    width: c.width,
    required: c.required,
    render: c.render
      ? (value: unknown, row: Record<string, unknown>) =>
          c.render!(value, row as T)
      : undefined,
  }));
}

/**
 * Configuration for column customization
 */
export interface ColumnOverride {
  title?: string;
  type?: EditableCellType;
  width?: string;
  required?: boolean;
  hidden?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

/**
 * Options for TableColumnBuilder
 */
export interface TableColumnBuilderOptions {
  /** Override or customize specific columns */
  overrides?: Record<string, ColumnOverride>;
  /** Fields to exclude from columns */
  excludeFields?: string[];
  /** Fields to include (if specified, only these will be included) */
  includeFields?: string[];
  /** Default width for all columns */
  defaultWidth?: string;
  /** Auto-format field names to human-readable titles */
  autoFormatTitles?: boolean;
}

/**
 * TableColumnBuilder - Automatically generates table columns from JSON data
 * Follows OOP principles for maintainability and extensibility
 */
export class TableColumnBuilder {
  private data: Array<Record<string, unknown>>;
  private options: TableColumnBuilderOptions;

  constructor(
    data: Array<Record<string, unknown>>,
    options: TableColumnBuilderOptions = {}
  ) {
    this.data = data;
    this.options = {
      autoFormatTitles: true,
      ...options,
    };
  }

  /**
   * Infers the data type of a field by analyzing sample values
   */
  private inferFieldType(fieldName: string): EditableCellType {
    // Check override first
    const override = this.options.overrides?.[fieldName];
    if (override?.type) return override.type;

    // Sample up to 10 non-null values
    const samples = this.data
      .map((row) => row[fieldName])
      .filter((v) => v !== null && v !== undefined)
      .slice(0, 10);

    if (samples.length === 0) return "text";

    // Check for date patterns
    if (
      samples.every(
        (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v as string)
      )
    ) {
      return "date";
    }

    // Check for numbers
    if (samples.every((v) => typeof v === "number" || !isNaN(Number(v)))) {
      // Check if it might be currency
      const values = samples.map((v) => Number(v));
      const hasDecimals = values.some((v) => v % 1 !== 0);
      const seemsCurrency =
        hasDecimals ||
        fieldName.toLowerCase().includes("price") ||
        fieldName.toLowerCase().includes("cost") ||
        fieldName.toLowerCase().includes("amount");

      return seemsCurrency ? "currency" : "number";
    }

    return "text";
  }

  /**
   * Converts a camelCase or snake_case field name to a human-readable title
   */
  private formatTitle(fieldName: string): string {
    // Check for override
    const override = this.options.overrides?.[fieldName];
    if (override?.title) return override.title;

    if (!this.options.autoFormatTitles) return fieldName;

    // Handle camelCase and snake_case
    const words = fieldName
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .trim()
      .split(/\s+/);

    // Capitalize first letter of each word
    return words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Gets all unique field names from the data
   */
  private getFieldNames(): string[] {
    const fieldSet = new Set<string>();
    this.data.forEach((row) => {
      Object.keys(row).forEach((key) => fieldSet.add(key));
    });

    let fields = Array.from(fieldSet);

    // Apply includeFields filter
    if (this.options.includeFields && this.options.includeFields.length > 0) {
      fields = fields.filter((f) => this.options.includeFields!.includes(f));
    }

    // Apply excludeFields filter
    if (this.options.excludeFields && this.options.excludeFields.length > 0) {
      fields = fields.filter((f) => !this.options.excludeFields!.includes(f));
    }

    // Remove hidden fields from overrides
    fields = fields.filter((f) => !this.options.overrides?.[f]?.hidden);

    return fields;
  }

  /**
   * Builds and returns the column configuration
   */
  public build(): EditableColumn[] {
    if (this.data.length === 0) return [];

    const fieldNames = this.getFieldNames();

    return fieldNames.map((fieldName) => {
      const override = this.options.overrides?.[fieldName];
      const type = this.inferFieldType(fieldName);

      return {
        id: fieldName,
        title: this.formatTitle(fieldName),
        type,
        width: override?.width || this.options.defaultWidth,
        required: override?.required,
        render: override?.render,
      };
    });
  }

  /**
   * Static helper method for quick column generation
   */
  public static fromJSON(
    data: Array<Record<string, unknown>>,
    options?: TableColumnBuilderOptions
  ): EditableColumn[] {
    const builder = new TableColumnBuilder(data, options);
    return builder.build();
  }
}

export function toList(v: unknown): string {
  return Array.isArray(v)
    ? (v as unknown[]).map(String).join(", ")
    : String(v ?? "");
}

export function parseList(value: unknown): string[] | undefined {
  if (typeof value !== "string") return undefined;
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : undefined;
}

export function formatConfidence(value: number): string {
  if (value <= 1) return `${Math.round(value * 100)}%`;
  return `${Math.round(value)}%`;
}

export function formatQuality(values: number[]): string {
  if (!Array.isArray(values) || values.length === 0) return "-";
  return values.map((v) => v.toFixed(2)).join(" · ");
}

export function formatErrors(errors: unknown[]): string {
  if (!Array.isArray(errors) || errors.length === 0) return "None";
  return String(errors.length);
}
