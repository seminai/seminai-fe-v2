export type ImportMethod = "csv" | "ddt" | "warehouse" | "registry";

export class ImportMethodPolicy {
  public static isSelected(
    current: ImportMethod | null,
    candidate: ImportMethod
  ): boolean {
    return current === candidate;
  }

  public static isLocked(current: ImportMethod | null): boolean {
    return current !== null;
  }

  public static canSelect(
    current: ImportMethod | null,
    candidate: ImportMethod
  ): boolean {
    return current === null || current === candidate;
  }

  public static label(method: ImportMethod): string {
    switch (method) {
      case "csv":
        return "CSV";
      case "ddt":
        return "DDT";
      case "warehouse":
        return "Magazzino";
      case "registry":
        return "Registro";
      default:
        return method;
    }
  }
}


