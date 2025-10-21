import type { EditableColumn } from "@/components/ui/table";

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
