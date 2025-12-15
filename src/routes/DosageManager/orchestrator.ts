import type {
  DosageOrchestratorSettings,
  OrchestratorIntensity,
  OrchestratorObjective,
} from "@/api/dosage-agent";

export type OrchestratorCategory = {
  id: string;
  label: string;
  description?: string;
  aliases?: string[];
};

export type OrchestratorTarget = {
  id: string;
  label: string;
  scientificName?: string;
  description?: string;
  crops?: string[];
  severity?: string;
  aliases?: string[];
  group: string;
};

type CategoryPriorityDataset = {
  defaultPriority?: string[];
  categories?: OrchestratorCategory[];
};

type PriorityTargetsDataset = {
  targets?: Record<string, Array<Omit<OrchestratorTarget, "group">>>;
};

export type OrchestratorDatasets = {
  categories: OrchestratorCategory[];
  defaultCategoryPriority: string[];
  targets: OrchestratorTarget[];
};

export class OrchestratorIntensityDefaults {
  public static getMaxProductsPerUnit(
    intensity: OrchestratorIntensity
  ): number {
    switch (intensity) {
      case "low":
        return 3;
      case "high":
        return 10;
      case "medium":
      default:
        return 6;
    }
  }
}

export class OrchestratorDefaultsFactory {
  public static create(): DosageOrchestratorSettings {
    return {
      objective: "balanced",
      categoryPriority: [],
      priorityTargets: [],
      agronomicNotes: null,
    };
  }
}

export class OrchestratorLabels {
  private static readonly objectiveLabels: Record<
    OrchestratorObjective,
    string
  > = {
    minimize_interventions: "Minimizza interventi",
    maximize_coverage: "Massimizza copertura",
    balanced: "Bilanciato",
    cost_effective: "Cost-effective",
  };

  private static readonly intensityLabels: Record<
    OrchestratorIntensity,
    string
  > = {
    low: "Bassa (3 prodotti/unità)",
    medium: "Media (6 prodotti/unità)",
    high: "Alta (10 prodotti/unità)",
  };

  public static objective(value: OrchestratorObjective): string {
    return this.objectiveLabels[value] ?? value;
  }

  public static intensity(value: OrchestratorIntensity): string {
    return this.intensityLabels[value] ?? value;
  }
}

export class OrchestratorDatasetsLoader {
  private readonly basePath: string;

  constructor(basePath: string = "/datasets/orchestrator") {
    this.basePath = basePath.replace(/\/$/, "");
  }

  public async load(): Promise<OrchestratorDatasets> {
    const [categoryRes, targetRes] = await Promise.all([
      fetch(`${this.basePath}/categoryPriority.json`),
      fetch(`${this.basePath}/priorityTargets.json`),
    ]);

    const categoryJson = (await categoryRes.json()) as CategoryPriorityDataset;
    const targetsJson = (await targetRes.json()) as PriorityTargetsDataset;

    const categories = Array.isArray(categoryJson.categories)
      ? categoryJson.categories
          .filter(
            (c) => c && typeof c.id === "string" && typeof c.label === "string"
          )
          .map((c) => ({
            id: String(c.id),
            label: String(c.label),
            description: c.description ? String(c.description) : undefined,
            aliases: Array.isArray(c.aliases)
              ? c.aliases.map((a) => String(a)).filter(Boolean)
              : undefined,
          }))
      : [];

    const defaultCategoryPriority = Array.isArray(categoryJson.defaultPriority)
      ? categoryJson.defaultPriority.map((id) => String(id)).filter(Boolean)
      : OrchestratorDefaultsFactory.create().categoryPriority ?? [];

    const targets = OrchestratorTargetsFlattener.flatten(targetsJson.targets);

    return {
      categories,
      defaultCategoryPriority,
      targets,
    };
  }
}

export class OrchestratorTargetsFlattener {
  public static flatten(
    raw?: Record<string, Array<Omit<OrchestratorTarget, "group">>>
  ): OrchestratorTarget[] {
    if (!raw || typeof raw !== "object") {
      return [];
    }

    const entries = Object.entries(raw);
    const flattened: OrchestratorTarget[] = [];

    for (const [group, list] of entries) {
      if (!Array.isArray(list)) {
        continue;
      }
      for (const item of list) {
        if (!item || typeof item !== "object") {
          continue;
        }
        const anyItem = item as Record<string, unknown>;
        const id = String(anyItem.id ?? "").trim();
        const label = String(anyItem.label ?? "").trim();
        if (!id || !label) {
          continue;
        }
        flattened.push({
          id,
          label,
          group,
          scientificName:
            typeof anyItem.scientificName === "string"
              ? anyItem.scientificName
              : undefined,
          description:
            typeof anyItem.description === "string"
              ? anyItem.description
              : undefined,
          crops: Array.isArray(anyItem.crops)
            ? anyItem.crops.map((c) => String(c)).filter(Boolean)
            : undefined,
          severity:
            typeof anyItem.severity === "string" ? anyItem.severity : undefined,
          aliases: Array.isArray(anyItem.aliases)
            ? anyItem.aliases.map((a) => String(a)).filter(Boolean)
            : undefined,
        });
      }
    }

    return flattened;
  }
}

export class OrchestratorSettingsUpdater {
  public static setNumber(
    current: DosageOrchestratorSettings,
    key:
      | "maxProductsPerUnit"
      | "maxApplicationsPerProductPerUnit"
      | "maxTotalJobs",
    raw: string
  ): DosageOrchestratorSettings {
    const trimmed = raw.trim();
    if (!trimmed) {
      const next = { ...current };
      delete (next as Record<string, unknown>)[key];
      return next;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      return current;
    }
    return { ...current, [key]: parsed };
  }
}

export class OrchestratorRequestBuilder {
  public static build(
    settings: DosageOrchestratorSettings,
    datasets: OrchestratorDatasets | null
  ): DosageOrchestratorSettings {
    const next: DosageOrchestratorSettings = { ...settings };

    // Forced orchestrator flags (not configurable via UI)
    next.useLlmForSelection = true;
    next.allowOutsideProductionTreatments = true;

    if (!Array.isArray(next.categoryPriority)) {
      next.categoryPriority = [];
    }

    if (typeof next.agronomicNotes === "string") {
      const trimmed = next.agronomicNotes.trim();
      next.agronomicNotes = trimmed.length > 0 ? trimmed : null;
    }

    // If priorityTargets are stored as ids, map them back to labels for backend payload
    if (
      Array.isArray(next.priorityTargets) &&
      next.priorityTargets.length > 0
    ) {
      const byId = new Map(
        (datasets?.targets ?? []).map((t) => [t.id, t.label])
      );
      next.priorityTargets = next.priorityTargets.map(
        (item) => byId.get(item) ?? item
      );
    }

    return next;
  }
}
