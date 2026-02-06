import type { ReactElement } from "react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import { useCompanies } from "@/hooks/useCompanies";
import { useProducts } from "@/hooks/useProducts";
import { PageHeader } from "@/components/organism/Header";
import {
  type EditableColumn,
  type EditableTableRef,
} from "@/components/organism/EditableTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Loader2,
  Calculator,
  CheckCircle2,
  Clock,
  Apple,
  FileText,
  Octagon,
  ArrowLeft,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import { type DosageLogEvent } from "@/services/dosageJobSocket";
import { toast } from "sonner";
import {
  dosageAgentApiService,
  type DosageProduct,
  type DosageStrategy,
  type DosageUnitOfProduction,
} from "@/api/dosage-agent";
import type { DosageOrchestratorSettings } from "@/api/dosage-agent";
import type { ProductionUnit } from "@/api/production-unit";
import type { Product, VerifiedPhytosanitaryProduct } from "@/api/products";
import { productsApiService } from "@/api/products";
import { JobDetails } from "./JobDetails";
import { useLiveLogs } from "./useLiveLogs";
import { HistorySection } from "./HistorySection";
import { ManageSection } from "./ManageSection";
import {
  type ActiveJobTableRow,
  type JobHistoryTableRow,
  type DosageJob,
  normalizeJob,
} from "./types";
import {
  type FitosanitariDatasetRecord,
  findRegNumberByName,
} from "@/services/fitosanitariRegistry";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useSidebar } from "@/components/ui/sidebar";
import {
  OrchestratorDatasetsLoader,
  OrchestratorDefaultsFactory,
  OrchestratorRequestBuilder,
  type OrchestratorDatasets,
  OrchestratorLabels,
} from "./orchestrator";
import { ImportMethodPolicy, type ImportMethod } from "./importMethod";
class DosageJobDetailsManager {
  public async load(job: DosageJob): Promise<DosageJob> {
    if (job.state === "completed" && job.result) {
      return job;
    }

    try {
      const statusResponse = await dosageAgentApiService.getJobStatus(job.id);
      const statusData = statusResponse.data;

      return {
        ...job,
        state: statusData.state,
        progress: statusData.progress,
        result: statusData.result,
        productsCount: statusData.data?.productsCount ?? job.productsCount,
        unitsCount: statusData.data?.unitsCount ?? job.unitsCount,
        updatedAt: new Date().toISOString(),
        error:
          statusData.state === "failed" || statusData.state === "stalled"
            ? "The dosage job has failed"
            : undefined,
      };
    } catch (error) {
      console.error("Failed to load job details:", error);
      throw error instanceof Error
        ? error
        : new Error("Unable to load dosage job details");
    }
  }
}

const dosageJobDetailsManager = new DosageJobDetailsManager();

class DosageJobCancellationService {
  private readonly api: typeof dosageAgentApiService;

  constructor(api: typeof dosageAgentApiService = dosageAgentApiService) {
    this.api = api;
  }

  public async cancel(jobIds: string[]): Promise<DosageJob[]> {
    const uniqueIds = [...new Set(jobIds.filter((id) => Boolean(id)))];

    if (uniqueIds.length === 0) {
      const listResponse = await this.api.listJobs();
      return listResponse.data.map(normalizeJob);
    }

    await this.api.cancelJobs(uniqueIds);

    const listResponse = await this.api.listJobs();
    return listResponse.data.map(normalizeJob);
  }
}

const dosageJobCancellationService = new DosageJobCancellationService();

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

class ActiveJobStateDescriptor {
  private static readonly variants: Record<
    DosageJob["state"],
    { label: string; variant: BadgeVariant }
  > = {
    queued: { label: "In coda", variant: "secondary" },
    waiting: { label: "In attesa", variant: "secondary" },
    active: { label: "In esecuzione", variant: "default" },
    completed: { label: "Completato", variant: "default" },
    failed: { label: "Fallito", variant: "destructive" },
    stalled: { label: "Bloccato", variant: "destructive" },
    delayed: { label: "Ritardato", variant: "secondary" },
  };

  public static describe(state: DosageJob["state"]): {
    label: string;
    variant: BadgeVariant;
  } {
    return this.variants[state] ?? { label: state, variant: "secondary" };
  }
}

class ActiveJobsTableRowBuilder {
  public static build(jobs: DosageJob[]): ActiveJobTableRow[] {
    return jobs.map((job) => {
      const descriptor = ActiveJobStateDescriptor.describe(job.state);
      const createdAt = new Date(job.createdAt);

      return {
        id: job.id,
        jobId: job.id,
        state: job.state,
        createdAtLabel: createdAt.toLocaleString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        stateLabel: descriptor.label,
        stateBadgeVariant: descriptor.variant,
        progress: job.progress,
        progressLabel: `${job.progress}%`,
        productsCount: job.productsCount,
        unitsCount: job.unitsCount,
      };
    });
  }

  public static extractId(row: Record<string, unknown>): string {
    const data = row as ActiveJobTableRow;
    return data.jobId || data.id;
  }
}

class JobStateBadgeRenderer {
  public static render(row: Record<string, unknown>): ReactElement {
    const data = row as {
      stateLabel: string;
      stateBadgeVariant: BadgeVariant;
    };
    return (
      <Badge variant={data.stateBadgeVariant}>
        <span className="text-xs font-medium">{data.stateLabel}</span>
      </Badge>
    );
  }
}

class JobProgressIndicatorRenderer {
  private static readonly pendingStates: DosageJob["state"][] = [
    "queued",
    "waiting",
    "active",
    "delayed",
  ];

  private static readonly failedStates: DosageJob["state"][] = [
    "failed",
    "stalled",
  ];

  public static render(row: Record<string, unknown>): ReactElement {
    const data = row as {
      state: DosageJob["state"];
      progressLabel: string;
    };

    if (this.pendingStates.includes(data.state)) {
      return (
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Seminai Logo"
            className="h-5 w-5 animate-spin"
          />
          <span className="text-sm text-neutral-500">In elaborazione...</span>
        </div>
      );
    }

    if (this.failedStates.includes(data.state)) {
      return (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <Octagon className="h-4 w-4" />
          <span>STOP</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>Completato</span>
      </div>
    );
  }
}

class ActiveJobsTableColumnsFactory {
  public static create(): EditableColumn[] {
    return [
      {
        id: "jobId",
        title: "Job ID",
        width: "200px",
        type: "text",
      },
      {
        id: "createdAtLabel",
        title: "Creato il",
        width: "180px",
        type: "text",
      },
      {
        id: "stateLabel",
        title: "Stato",
        width: "160px",
        render: (_value, row) => JobStateBadgeRenderer.render(row),
      },
      {
        id: "progress",
        title: "Progresso",
        width: "240px",
        type: "number",
        render: (_value, row) => JobProgressIndicatorRenderer.render(row),
      },
      {
        id: "productsCount",
        title: "Prodotti",
        width: "120px",
        type: "number",
      },
      {
        id: "unitsCount",
        title: "Unità",
        width: "120px",
        type: "number",
      },
    ];
  }
}

class JobHistoryTableRowBuilder {
  public static build(jobs: DosageJob[]): JobHistoryTableRow[] {
    return [...jobs]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map((job) => {
        const descriptor = ActiveJobStateDescriptor.describe(job.state);
        const createdAt = new Date(job.createdAt);

        return {
          id: job.id,
          jobId: job.id,
          state: job.state,
          createdAtLabel: createdAt.toLocaleString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          stateLabel: descriptor.label,
          stateBadgeVariant: descriptor.variant,
          progress: job.progress,
          progressLabel: `${job.progress}%`,
          productsCount: job.productsCount,
          unitsCount: job.unitsCount,
          job,
        };
      });
  }
}

class DosagePlaceholderRenderer {
  public renderEmptyProductsPlaceholder(): ReactElement {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-dashed border-neutral-200 rounded-xl bg-white mt-6">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-neutral-100 text-neutral-500 mb-4">
          <Apple className="h-8 w-8" />
        </div>
        <p className="text-base font-medium text-neutral-700">
          Non ci sono dati, caricali!
        </p>
        <p className="text-sm text-neutral-500 mt-2 text-center max-w-md">
          Importa o aggiungi prodotti per iniziare a calcolare i dosaggi delle
          tue unità produttive.
        </p>
      </div>
    );
  }
}

const dosagePlaceholderRenderer = new DosagePlaceholderRenderer();

interface DosageStrategyOption {
  value: DosageStrategy;
  label: string;
  description: string;
}

class DosageStrategyOptionsFactory {
  private static readonly options: DosageStrategyOption[] = [
    {
      value: "current",
      label: "Dose Corrente",
      description: "Applica i dosaggi consigliati presenti in etichetta.",
    },
    {
      value: "max",
      label: "Dose Massima",
      description: "Utilizza la dose massima consentita per ciascun prodotto.",
    },
    {
      value: "min",
      label: "Dose Minima",
      description:
        "Applica la dose minima certificata per la coltura selezionata.",
    },
    {
      value: "avg",
      label: "Dose Media",
      description: "Calcola la media tra la dose minima e quella massima.",
    },
  ];

  public static create(): DosageStrategyOption[] {
    return [...this.options];
  }

  public static getByValue(value: DosageStrategy): DosageStrategyOption {
    return (
      this.options.find((option) => option.value === value) ?? this.options[0]
    );
  }

  public static buildCurlSnippet(
    strategy: DosageStrategy,
    outStockLimiter: boolean,
    loadWarehouse: boolean = false,
  ): string {
    return [
      'curl -X POST "https://<host>/dosage-agent/start-job" \\',
      "",
      '  -H "Content-Type: application/json" \\',
      "",
      '  -H "Authorization: Bearer <JWT_TOKEN>" \\',
      "",
      "  -d '{",
      '    "products": [',
      "      {",
      '        "productName": "TELDOR PLUS",',
      '        "registrationNumber": "17754",',
      '        "quantity": 50,',
      '        "quantityUnitOfMeasure": "L",',
      `        "loadWarehouse": ${loadWarehouse}`,
      "      },",
      "      {",
      '        "productName": "FORUM R WDG",',
      '        "registrationNumber": "11693",',
      '        "quantity": 20,',
      '        "quantityUnitOfMeasure": "kg",',
      `        "loadWarehouse": ${loadWarehouse}`,
      "      }",
      "    ],",
      '    "unitOfProduction": [',
      "      {",
      '        "id": "uuid-unita-1",',
      '        "cropName": "Vite",',
      '        "variety": "Sangiovese",',
      '        "areaHa": 5.2',
      "      },",
      "      {",
      '        "id": "uuid-unita-2",',
      '        "cropName": "Vite",',
      '        "variety": "Trebbiano",',
      '        "areaHa": 3.8',
      "      }",
      "    ],",
      `    "strategy": "${strategy}",`,
      `    "outStockLimiter": ${outStockLimiter},`,
      '    "orchestrator": {',
      '      "objective": "balanced",',
      '      "intensity": "medium",',
      '      "maxProductsPerUnit": 6,',
      '      "maxApplicationsPerProductPerUnit": 2,',
      '      "maxTotalJobs": 100,',
      '      "allowOutsideProductionTreatments": true,',
      '      "categoryPriority": ["fungicide", "insecticide", "herbicide", "acaricide"],',
      '      "priorityTargets": ["Peronospora", "Oidio", "Botrite"],',
      '      "agronomicNotes": "Pressione oidio alta quest anno, evitare rame se possibile",',
      '      "useLlmForSelection": true',
      "    }",
      "  }'",
    ].join("\n");
  }
}

interface ProductionUnitTableRow extends Record<string, unknown> {
  id: string;
  name: string;
  cropName: string;
  cropType: string;
  variety: string;
  protectionStructure?: string | null;
  fieldsCount: number;
  areaHa: number;
  areaLabel: string;
  treatedAreaHa: number;
  treatedAreaLabel: string;
  companyName: string;
}

class ProductionUnitAreaFormatter {
  private readonly areaHa: number;

  constructor(areaHa: number) {
    this.areaHa = areaHa;
  }

  public format(): string {
    return `${this.areaHa.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ha`;
  }
}

class ProductionUnitTableRowBuilder {
  private readonly units: ProductionUnit[];

  constructor(units: ProductionUnit[]) {
    this.units = units;
  }

  public build(): ProductionUnitTableRow[] {
    return this.units.map((unit) => {
      const areaFormatter = new ProductionUnitAreaFormatter(
        unit.productionUnit.areaHa,
      );
      const treatedAreaFormatter = new ProductionUnitAreaFormatter(
        unit.productionUnit.areaHa,
      );

      return {
        id: unit.productionUnit.id,
        name: unit.productionUnit.name,
        cropName: unit.productionUnit.cropName,
        cropType: unit.productionUnit.cropType,
        variety: unit.productionUnit.variety,
        protectionStructure: unit.productionUnit.protectionStructure,
        fieldsCount: unit.fields.length,
        areaHa: unit.productionUnit.areaHa,
        areaLabel: areaFormatter.format(),
        treatedAreaHa: unit.productionUnit.areaHa,
        treatedAreaLabel: treatedAreaFormatter.format(),
        companyName: unit.companyName,
      };
    });
  }
}

class ProductionUnitTableColumnsFactory {
  public static create(): EditableColumn[] {
    return [
      {
        id: "name",
        title: "Unità Produttiva",
        width: "280px",
        render: (_value, row) =>
          ProductionUnitTableColumnsFactory.renderUnitInfo(row),
        readOnly: true,
      },
      {
        id: "companyName",
        title: "Azienda",
        width: "200px",
        render: (_value, row) =>
          ProductionUnitTableColumnsFactory.renderCompany(row),
        readOnly: true,
      },
      {
        id: "variety",
        title: "Varietà",
        width: "200px",
        render: (_value, row) =>
          ProductionUnitTableColumnsFactory.renderVariety(row),
        readOnly: true,
      },
      {
        id: "areaHa",
        title: "Superficie",
        width: "160px",
        render: (_value, row) =>
          ProductionUnitTableColumnsFactory.renderArea(row),
        readOnly: true,
      },
      {
        id: "treatedAreaHa",
        title: "Area da trattare",
        width: "180px",
        type: "number",
        placeholder: "0.00",
        render: (_value, row) =>
          ProductionUnitTableColumnsFactory.renderTreatedArea(row),
        onValueChange: ({ value, rowData }) => {
          const numValue =
            typeof value === "number" ? value : parseFloat(String(value));
          if (!isNaN(numValue) && numValue > 0) {
            const areaHa = (rowData.areaHa as number) ?? numValue;
            // Limita treatedAreaHa a areaHa se supera
            const treatedAreaHa = Math.min(numValue, areaHa);
            const updatedTreatedAreaFormatter = new ProductionUnitAreaFormatter(
              treatedAreaHa,
            );
            return {
              treatedAreaHa,
              treatedAreaLabel: updatedTreatedAreaFormatter.format(),
            };
          }
          return {};
        },
      },
      {
        id: "fieldsCount",
        title: "Campi",
        width: "120px",
        render: (_value, row) =>
          ProductionUnitTableColumnsFactory.renderFields(row),
        readOnly: true,
      },
    ];
  }

  private static asRow(row: Record<string, unknown>): ProductionUnitTableRow {
    return row as ProductionUnitTableRow;
  }

  private static renderUnitInfo(row: Record<string, unknown>): ReactElement {
    const data = ProductionUnitTableColumnsFactory.asRow(row);

    return (
      <div className="space-y-1">
        <p className="font-medium text-neutral-900">{data.name}</p>
        <p className="text-sm text-neutral-500">
          {data.cropName} - {data.cropType}
        </p>
        <p className="text-xs text-neutral-500">{data.variety || "N/D"}</p>
      </div>
    );
  }

  private static renderCompany(row: Record<string, unknown>): ReactElement {
    const data = ProductionUnitTableColumnsFactory.asRow(row);

    return (
      <span className="text-sm font-medium text-neutral-900">
        {data.companyName || "-"}
      </span>
    );
  }

  private static renderVariety(row: Record<string, unknown>): ReactElement {
    const data = ProductionUnitTableColumnsFactory.asRow(row);

    return (
      <Badge variant="outline" className="text-xs">
        {data.variety || "N/D"}
      </Badge>
    );
  }

  private static renderArea(row: Record<string, unknown>): ReactElement {
    const data = ProductionUnitTableColumnsFactory.asRow(row);

    return (
      <Badge variant="secondary" className="text-xs">
        {data.areaLabel}
      </Badge>
    );
  }

  private static renderFields(row: Record<string, unknown>): ReactElement {
    const data = ProductionUnitTableColumnsFactory.asRow(row);

    return <span className="text-sm text-neutral-700">{data.fieldsCount}</span>;
  }

  private static renderTreatedArea(row: Record<string, unknown>): ReactElement {
    const data = ProductionUnitTableColumnsFactory.asRow(row);
    return (
      <Badge variant="secondary" className="text-xs">
        {data.treatedAreaLabel}
      </Badge>
    );
  }
}

class WarehouseProductStockCalculator {
  private readonly stocks: Product["stocks"];

  constructor(stocks: Product["stocks"]) {
    this.stocks = stocks;
  }

  public calculateNetQuantity(): number {
    return this.stocks.reduce((total, stock) => {
      const quantity = stock.quantity ?? 0;
      return stock.type === "IN" ? total + quantity : total - quantity;
    }, 0);
  }

  public getUnitOfMeasure(): string {
    return this.stocks[0]?.unitOfMeasureQuantity || "kg";
  }
}

class WarehouseRegistrationNumberSanitizer {
  private static readonly digitsRegex = /\d+/g;

  public static normalize(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    const trimmed = String(value).trim();
    const digits = trimmed.match(this.digitsRegex)?.join("") ?? "";
    return digits;
  }

  public static pickFirstNumeric(values: Array<unknown>): string {
    for (const value of values) {
      const normalized = this.normalize(value);
      if (normalized) {
        return normalized;
      }
    }
    return "";
  }
}

class WarehouseProductRegistrationResolver {
  private readonly registryLookup: typeof findRegNumberByName;

  constructor(
    registryLookup: typeof findRegNumberByName = findRegNumberByName,
  ) {
    this.registryLookup = registryLookup;
  }

  public async resolve(
    productName: string,
    fallbackCandidates: Array<string | undefined>,
  ): Promise<string> {
    const fallback =
      WarehouseRegistrationNumberSanitizer.pickFirstNumeric(fallbackCandidates);

    if (!productName) {
      return fallback;
    }

    try {
      const registryNumber = await this.registryLookup(productName);
      const normalizedRegistry =
        WarehouseRegistrationNumberSanitizer.normalize(registryNumber);
      if (normalizedRegistry) {
        return normalizedRegistry;
      }
    } catch (error) {
      console.error(
        "Failed to resolve registration number from fitosanitari dataset:",
        error,
      );
    }

    return fallback;
  }
}

class WarehouseProductsMapper {
  private static readonly registrationResolver =
    new WarehouseProductRegistrationResolver();

  public static async toDosageProducts(
    products: Product[],
  ): Promise<DosageProduct[]> {
    const mappedProducts = await Promise.all(
      products.map(async (product) => {
        const calculator = new WarehouseProductStockCalculator(product.stocks);
        const netQuantity = calculator.calculateNetQuantity();
        const registrationNumber =
          (await this.registrationResolver.resolve(product.name, [
            product.sku,
            product.id,
          ])) || "";

        return {
          productName: product.name,
          registrationNumber,
          quantity: netQuantity > 0 ? netQuantity : 0,
          quantityUnitOfMeasure: calculator.getUnitOfMeasure(),
          loadWarehouse: true,
          supplierName: product.warehouse.company.name,
        };
      }),
    );

    return mappedProducts.filter((product) => product.quantity > 0);
  }
}

class DosageProductKeyBuilder {
  public static build(product: DosageProduct): string {
    return `${product.productName}-${product.registrationNumber}`;
  }
}

/**
 * Componente per visualizzare un singolo evento di log live
 */
function LiveLogEventCard({ event }: { event: DosageLogEvent }): ReactElement {
  const timestamp = new Date(event.timestamp);
  const timeLabel = timestamp.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const getTypeStyles = (
    type: DosageLogEvent["type"],
  ): { bg: string; text: string; border: string; icon: ReactElement } => {
    switch (type) {
      case "match":
        return {
          bg: "bg-green-50",
          text: "text-green-700",
          border: "border-green-200",
          icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          text: "text-yellow-700",
          border: "border-yellow-200",
          icon: <Clock className="h-4 w-4 text-yellow-600" />,
        };
      case "error":
        return {
          bg: "bg-red-50",
          text: "text-red-700",
          border: "border-red-200",
          icon: <Octagon className="h-4 w-4 text-red-600" />,
        };
      case "progress":
        return {
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />,
        };
      case "complete":
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        };
      default:
        return {
          bg: "bg-neutral-50",
          text: "text-neutral-700",
          border: "border-neutral-200",
          icon: <FileText className="h-4 w-4 text-neutral-500" />,
        };
    }
  };

  const styles = getTypeStyles(event.type);

  return (
    <div
      className={`rounded-xl border ${styles.border} ${styles.bg} p-3 space-y-2`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {styles.icon}
          <Badge variant="outline" className="text-xs uppercase">
            {event.type}
          </Badge>
        </div>
        <span className="text-xs text-neutral-500 font-mono">{timeLabel}</span>
      </div>
      <p className={`text-sm ${styles.text} leading-relaxed break-words`}>
        {event.message}
      </p>
      {event.metadata && Object.keys(event.metadata).length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {event.metadata.productName && (
            <Badge variant="secondary" className="text-xs">
              Prodotto: {event.metadata.productName}
            </Badge>
          )}
          {event.metadata.quantity !== undefined && (
            <Badge variant="secondary" className="text-xs">
              Quantità: {event.metadata.quantity}
            </Badge>
          )}
          {event.metadata.unitId && (
            <Badge variant="outline" className="text-xs font-mono">
              Unit: {event.metadata.unitId.slice(0, 8)}...
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default function DosageManager() {
  const queryClient = useQueryClient();
  const { state: sidebarState, isMobile } = useSidebar();
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const { companies } = useCompanies();
  const { productionUnits, isLoading: loadingUnits } = useProductionUnit({
    companyIds: selectedCompanyIds,
  });
  const {
    products: warehouseInventory,
    isLoading: isWarehouseProductsLoading,
  } = useProducts();

  const [currentPage, setCurrentPage] = useState<"manage" | "history">(
    "manage",
  );
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [treatedAreaHaMap, setTreatedAreaHaMap] = useState<Map<string, number>>(
    new Map(),
  );
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  // Extended product type with internal ID for unique row identification
  type ProductWithInternalId = DosageProduct & { _internalId: string };
  const [products, setProducts] = useState<ProductWithInternalId[]>([]);
  const [productSources, setProductSources] = useState<
    Map<string, "warehouse" | "csv" | "ddt" | "notes">
  >(new Map());
  // Counter for generating unique IDs
  const productIdCounterRef = useRef<number>(0);
  const [selectedImportMethod, setSelectedImportMethod] =
    useState<ImportMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [strategy, setStrategy] = useState<DosageStrategy>("avg");
  const [outStockLimiter, setOutStockLimiter] = useState<boolean>(true);
  const [loadWarehouse, setLoadWarehouse] = useState<boolean>(false);
  const [orchestratorSettings, setOrchestratorSettings] =
    useState<DosageOrchestratorSettings>(() =>
      OrchestratorDefaultsFactory.create(),
    );
  const [orchestratorDatasets, setOrchestratorDatasets] =
    useState<OrchestratorDatasets | null>(null);
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");

  const editableTableRef = useRef<EditableTableRef>(null);

  const [jobs, setJobs] = useState<DosageJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<DosageJob | null>(null);
  const [isJobDetailsLoading, setIsJobDetailsLoading] = useState(false);
  const [isCancellingJobs, setIsCancellingJobs] = useState(false);
  const [selectedActiveJobIds, setSelectedActiveJobIds] = useState<string[]>(
    [],
  );
  const [isImportingFromWarehouse, setIsImportingFromWarehouse] =
    useState(false);
  const [isImportingFromNotes, setIsImportingFromNotes] = useState(false);

  const footerRef = useRef<HTMLDivElement | null>(null);
  const [footerHeight, setFooterHeight] = useState<number>(0);
  const [mobileBottomOccupied, setMobileBottomOccupied] = useState<number>(0);

  useEffect(() => {
    if (!isMobile) {
      setFooterHeight(0);
      setMobileBottomOccupied(0);
      return;
    }

    const el = footerRef.current;
    if (!el) {
      return;
    }

    const update = () => {
      setFooterHeight(el.getBoundingClientRect().height);
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(el);

    return () => observer.disconnect();
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setMobileBottomOccupied(0);
      return;
    }

    const el = document.querySelector<HTMLElement>(
      '[data-mobile-bottom-bar="true"]',
    );
    if (!el) {
      setMobileBottomOccupied(0);
      return;
    }

    const update = () => {
      const rect = el.getBoundingClientRect();
      const occupied = Math.max(window.innerHeight - rect.top, 0);
      setMobileBottomOccupied(occupied);
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(el);

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [isMobile]);

  const {
    isLiveLogsDrawerOpen,
    liveLogsJobId,
    liveLogEvents,
    liveSocketState,
    liveLogsScrollRef,
    handleOpenLiveLogs,
    handleCloseLiveLogs,
    reconnectLiveLogs,
    clearLiveLogEvents,
  } = useLiveLogs();
  const isResumeSyncInProgressRef = useRef(false);
  const isHistoryPage = currentPage === "history";
  const fetchJobsFromApi = useCallback(async () => {
    try {
      const previousJobs = jobs;
      const response = await dosageAgentApiService.listJobs();
      const normalized = response.data.map(normalizeJob);
      setJobs(normalized);

      // Verifica se qualche job è passato da active a completed
      // e invalida la cache di React Query per i job groups
      // Solo se ci sono job precedenti e almeno un job è stato completato
      if (previousJobs.length > 0 && normalized.length > 0) {
        const hasJobCompleted = normalized.some((newJob) => {
          const oldJob = previousJobs.find((j) => j.id === newJob.id);
          if (!oldJob) return false;
          const wasActive =
            oldJob.state === "queued" ||
            oldJob.state === "waiting" ||
            oldJob.state === "active" ||
            oldJob.state === "delayed";
          const isNowCompleted = newJob.state === "completed";
          return wasActive && isNowCompleted;
        });

        if (hasJobCompleted) {
          // Invalida la cache per i job groups quando un job viene completato
          // Non fa refetch automatico, solo marca come stale
          queryClient.invalidateQueries({
            queryKey: ["job-groups-summary"],
            refetchType: "none", // Non fare refetch automatico
          });
          queryClient.invalidateQueries({
            queryKey: ["job-group-detail"],
            refetchType: "none", // Non fare refetch automatico
          });
        }
      }
    } catch (error) {
      console.error("Failed to load dosage jobs", error);
    }
  }, [jobs, queryClient]);

  useEffect(() => {
    const loader = new OrchestratorDatasetsLoader();
    loader
      .load()
      .then((datasets) => {
        setOrchestratorDatasets(datasets);
      })
      .catch((error) => {
        console.error("Failed to load orchestrator datasets", error);
      });
  }, []);
  const strategyOptions = useMemo(
    () => DosageStrategyOptionsFactory.create(),
    [],
  );
  const selectedStrategyOption = useMemo(
    () => DosageStrategyOptionsFactory.getByValue(strategy),
    [strategy],
  );

  const handleShowHistory = useCallback(() => {
    setCurrentPage("history");
  }, []);

  const handleShowManage = useCallback(() => {
    setCurrentPage("manage");
  }, []);

  const historyButtonLabel = isHistoryPage
    ? "Torna alla gestione"
    : "Storico operazioni";
  const historyButtonAction = isHistoryPage
    ? handleShowManage
    : handleShowHistory;

  // Colonne per la tabella editabile dei prodotti
  const productColumns: EditableColumn[] = [
    {
      id: "productName",
      title: "Nome Prodotto",
      type: "text",
      required: true,
      placeholder: "Inserisci nome prodotto",
    },
    {
      id: "registrationNumber",
      title: "N. Registrazione",
      type: "text",
      required: true,
      placeholder: "Inserisci numero registrazione",
    },
    {
      id: "quantity",
      title: "Quantità",
      type: "number",
      required: true,
      placeholder: "0",
    },
    {
      id: "quantityUnitOfMeasure",
      title: "Unità",
      type: "text",
      required: true,
      placeholder: "kg, L, ecc.",
    },
    {
      id: "supplierName",
      title: "Fornitore",
      type: "text",
      required: false,
      placeholder: "Nome fornitore",
    },
    {
      id: "supplierVat",
      title: "P.IVA",
      type: "text",
      required: false,
      placeholder: "Partita IVA",
    },
    {
      id: "orderNumber",
      title: "Codice DDT",
      type: "text",
      required: false,
      placeholder: "Codice DDT",
    },
    {
      id: "ddtDate",
      title: "Data DDT",
      type: "text",
      required: false,
      placeholder: "Data DDT",
    },
  ];

  // Converte i dati della tabella in ProductWithInternalId[]
  const convertTableRowsToProducts = useCallback(
    (rows: Array<Record<string, unknown>>): ProductWithInternalId[] => {
      return rows.map((row) => {
        // Use existing _internalId if present, otherwise generate a new one
        const internalId =
          (row._internalId as string | undefined) ||
          `product-${Date.now()}-${++productIdCounterRef.current}`;
        return {
          productName: String(row.productName || ""),
          registrationNumber: String(row.registrationNumber || ""),
          quantity: Number(row.quantity) || 0,
          quantityUnitOfMeasure: String(row.quantityUnitOfMeasure || ""),
          loadWarehouse:
            typeof row.loadWarehouse === "boolean" ? row.loadWarehouse : false,
          supplierName: row.supplierName ? String(row.supplierName) : undefined,
          supplierVat: row.supplierVat ? String(row.supplierVat) : undefined,
          ddtDate: row.ddtDate ? String(row.ddtDate) : undefined,
          orderNumber: row.orderNumber ? String(row.orderNumber) : undefined,
          _internalId: internalId,
        };
      });
    },
    [],
  );

  // Gestisce l'aggiunta di righe dalla tabella editabile
  const handleAddRows = useCallback(
    (
      rows: Array<Record<string, unknown>>,
      source: "csv" | "ddt" = "csv",
    ): void => {
      if (!editableTableRef.current) {
        return;
      }
      // Se la sorgente è DDT o CSV, imposta loadWarehouse a false
      const rowsWithLoadWarehouse = rows.map((row) => {
        if (source === "ddt" || source === "csv") {
          return { ...row, loadWarehouse: false };
        }
        return row;
      });
      editableTableRef.current.addRows(rowsWithLoadWarehouse);
      // Aggiorna anche lo stato dei prodotti per mantenere la sincronizzazione
      const newProducts = convertTableRowsToProducts(rowsWithLoadWarehouse);
      setProducts((prev) => {
        const existingIds = new Set(
          prev.map((p) => `${p.productName}-${p.registrationNumber}`),
        );
        const uniqueNewProducts = newProducts.filter(
          (p) => !existingIds.has(`${p.productName}-${p.registrationNumber}`),
        );
        // Traccia la provenienza dei nuovi prodotti
        setProductSources((prevSources) => {
          const updated = new Map(prevSources);
          uniqueNewProducts.forEach((product) => {
            const key = `${product.productName}-${product.registrationNumber}`;
            updated.set(key, source);
          });
          return updated;
        });
        return [...prev, ...uniqueNewProducts];
      });
    },
    [convertTableRowsToProducts],
  );

  // Wrapper per CSV import
  const handleAddRowsFromCsv = useCallback(
    (rows: Array<Record<string, unknown>>): void => {
      handleAddRows(rows, "csv");
    },
    [handleAddRows],
  );

  // Wrapper per DDT import
  const handleAddRowsFromDdt = useCallback(
    (rows: Array<Record<string, unknown>>): void => {
      handleAddRows(rows, "ddt");
    },
    [handleAddRows],
  );

  // Gestisce il salvataggio dalla tabella editabile
  const handleSaveProducts = (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }): void => {
    // Converte i prodotti creati e aggiornati
    const createdProducts = convertTableRowsToProducts(payload.created);
    const updatedProducts = convertTableRowsToProducts(payload.updated);

    // Traccia la provenienza dei prodotti creati (default: csv se aggiunti manualmente)
    setProductSources((prevSources) => {
      const updated = new Map(prevSources);
      createdProducts.forEach((product) => {
        const key = `${product.productName}-${product.registrationNumber}`;
        if (!updated.has(key)) {
          updated.set(key, "csv");
        }
      });
      return updated;
    });

    // Aggiorna lo stato: rimuove quelli aggiornati, aggiunge i nuovi e gli aggiornati
    setProducts((prev) => {
      const updatedInternalIds = new Set(
        updatedProducts.map((p) => p._internalId),
      );
      // Rimuove i prodotti aggiornati dalla lista precedente usando _internalId
      const filtered = prev.filter(
        (p) => !updatedInternalIds.has(p._internalId),
      );
      // Aggiunge i nuovi prodotti e quelli aggiornati
      return [...filtered, ...createdProducts, ...updatedProducts];
    });

    toast.success("Prodotti salvati", {
      description: `${payload.created.length} creati, ${payload.updated.length} aggiornati`,
    });
  };

  // Gestisce l'eliminazione dei prodotti dalla tabella editabile
  const handleDeleteProducts = useCallback(
    (deletedRows: Array<Record<string, unknown>>): void => {
      const deletedProducts = convertTableRowsToProducts(deletedRows);
      const deletedInternalIds = new Set(
        deletedProducts.map((p) => p._internalId),
      );

      // Rimuove i prodotti eliminati dallo stato usando _internalId
      setProducts((prev) =>
        prev.filter((p) => !deletedInternalIds.has(p._internalId)),
      );

      // Rimuove anche le sorgenti dei prodotti eliminati
      setProductSources((prevSources) => {
        const updated = new Map(prevSources);
        deletedProducts.forEach((product) => {
          const key = `${product.productName}-${product.registrationNumber}`;
          updated.delete(key);
        });
        return updated;
      });

      toast.success("Prodotti eliminati", {
        description: `${deletedRows.length} prodotti eliminati con successo`,
      });
    },
    [convertTableRowsToProducts],
  );

  // Converte i prodotti in formato per la tabella
  const productsAsRows = useMemo(() => {
    return products.map((product) => ({
      _internalId: product._internalId,
      productName: product.productName,
      registrationNumber: product.registrationNumber,
      quantity: product.quantity,
      quantityUnitOfMeasure: product.quantityUnitOfMeasure,
      supplierName: product.supplierName || "",
      supplierVat: product.supplierVat || "",
      loadWarehouse: product.loadWarehouse,
      ddtDate: product.ddtDate || "",
      orderNumber: product.orderNumber || "",
    }));
  }, [products]);

  const getDefaultUnitOfMeasure = useCallback(
    (record: FitosanitariDatasetRecord): string => {
      const description = (record.formulationDescription || "")
        .toLowerCase()
        .trim();
      const code = (record.formulationCode || "").toUpperCase();
      const looksLiquid =
        description.includes("liquido") ||
        description.includes("sospensione") ||
        description.includes("emulsione") ||
        description.includes("olio") ||
        code.startsWith("L") ||
        code.includes("SL") ||
        code.includes("AL");
      if (looksLiquid) {
        return "L";
      }
      const looksGranular =
        description.includes("granul") ||
        description.includes("polvere") ||
        description.includes("microgranul") ||
        description.includes("sospensione concentrata") ||
        code.includes("WG") ||
        code.includes("WP") ||
        code.includes("SG");
      if (looksGranular) {
        return "kg";
      }
      return "kg";
    },
    [],
  );

  const handleRegistryProductSelected = useCallback(
    (record: FitosanitariDatasetRecord) => {
      if (!editableTableRef.current) {
        return;
      }
      editableTableRef.current.prefillCreateRow({
        productName: record.productName,
        registrationNumber: record.registrationNumber,
        supplierName: record.companyName || "",
        quantityUnitOfMeasure: getDefaultUnitOfMeasure(record),
      });
    },
    [getDefaultUnitOfMeasure],
  );

  const activeJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.state === "queued" ||
          job.state === "waiting" ||
          job.state === "active" ||
          job.state === "delayed",
      ),
    [jobs],
  );
  const activeJobColumns = useMemo<EditableColumn[]>(
    () => [
      ...ActiveJobsTableColumnsFactory.create(),
      {
        id: "liveActions",
        title: "Live",
        width: "120px",
        render: (_value, row) => {
          const data = row as ActiveJobTableRow;
          const isCurrentlyLive =
            isLiveLogsDrawerOpen && liveLogsJobId === data.jobId;

          return (
            <Button
              variant={isCurrentlyLive ? "default" : "outline"}
              size="sm"
              className={
                isCurrentlyLive
                  ? "gap-2 bg-green-600 text-white hover:bg-green-700"
                  : "gap-2 text-green-600 border-green-600 hover:bg-green-50"
              }
              onClick={(e) => {
                e.stopPropagation();
                if (isCurrentlyLive) {
                  handleCloseLiveLogs();
                } else {
                  handleOpenLiveLogs(data.jobId);
                }
              }}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Live</span>
            </Button>
          );
        },
      },
    ],
    [
      isLiveLogsDrawerOpen,
      liveLogsJobId,
      handleOpenLiveLogs,
      handleCloseLiveLogs,
    ],
  );
  const activeJobRows = useMemo(
    () => ActiveJobsTableRowBuilder.build(activeJobs),
    [activeJobs],
  );
  const historyJobRows = useMemo(
    () => JobHistoryTableRowBuilder.build(jobs),
    [jobs],
  );
  const activeSelectionLabel = useMemo(() => {
    if (selectedActiveJobIds.length === 0) {
      return "Nessun job selezionato";
    }
    if (selectedActiveJobIds.length === 1) {
      return "1 job selezionato";
    }
    return `${selectedActiveJobIds.length} job selezionati`;
  }, [selectedActiveJobIds]);

  // Load jobs from API on mount - solo una volta
  useEffect(() => {
    void fetchJobsFromApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al mount, non quando fetchJobsFromApi cambia

  // Poll active jobs
  useEffect(() => {
    // Optimization: prevent polling when tab is backgrounded
    const POLLING_INTERVAL_MS = 10000;

    const interval = setInterval(async () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      // Non fare chiamate se non ci sono job attivi (tutti completati)
      if (activeJobs.length === 0) {
        return;
      }

      await fetchJobsFromApi();
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchJobsFromApi, activeJobs.length]);

  useEffect(() => {
    setSelectedActiveJobIds((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const availableIds = new Set(activeJobs.map((job) => job.id));
      const filtered = prev.filter((id) => availableIds.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [activeJobs]);

  useEffect(() => {
    const syncOnResume = () => {
      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }

      if (isResumeSyncInProgressRef.current) {
        return;
      }

      // Non fare chiamate se non ci sono job attivi (tutti completati)
      // Fai eccezione solo se ci sono live logs aperti
      if (activeJobs.length === 0 && !isLiveLogsDrawerOpen) {
        return;
      }

      isResumeSyncInProgressRef.current = true;

      (async () => {
        try {
          await fetchJobsFromApi();

          if (isLiveLogsDrawerOpen && liveLogsJobId) {
            reconnectLiveLogs();
          }
        } catch (error) {
          console.error("Failed to sync jobs after resume", error);
        } finally {
          isResumeSyncInProgressRef.current = false;
        }
      })();
    };

    window.addEventListener("visibilitychange", syncOnResume);
    window.addEventListener("focus", syncOnResume);
    window.addEventListener("pageshow", syncOnResume);

    return () => {
      window.removeEventListener("visibilitychange", syncOnResume);
      window.removeEventListener("focus", syncOnResume);
      window.removeEventListener("pageshow", syncOnResume);
    };
  }, [
    fetchJobsFromApi,
    isLiveLogsDrawerOpen,
    liveLogsJobId,
    reconnectLiveLogs,
    activeJobs.length,
  ]);

  // Filter production units by search query (company filtering is done by API)
  const filteredUnits = useMemo(() => {
    if (selectedCompanyIds.length === 0) return [];
    let units = productionUnits;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      units = units.filter(
        (unit) =>
          unit.productionUnit.name.toLowerCase().includes(query) ||
          unit.productionUnit.cropName.toLowerCase().includes(query) ||
          unit.productionUnit.variety.toLowerCase().includes(query),
      );
    }

    return units;
  }, [productionUnits, selectedCompanyIds, searchQuery]);

  // Get selected units data
  const selectedUnits = useMemo(() => {
    return filteredUnits.filter((unit) =>
      selectedUnitIds.includes(unit.productionUnit.id),
    );
  }, [filteredUnits, selectedUnitIds]);

  // Reset treatedAreaHaMap when company selection changes
  useEffect(() => {
    setTreatedAreaHaMap(new Map());
  }, [selectedCompanyIds]);

  const productionUnitTableColumns = useMemo(() => {
    return ProductionUnitTableColumnsFactory.create();
  }, []);

  const productionUnitTableRows = useMemo(() => {
    const builder = new ProductionUnitTableRowBuilder(filteredUnits);
    const rows = builder.build();
    // Applica i treatedAreaHa modificati se presenti
    return rows.map((row) => {
      const modifiedTreatedAreaHa = treatedAreaHaMap.get(row.id);
      if (modifiedTreatedAreaHa !== undefined) {
        const updatedTreatedAreaFormatter = new ProductionUnitAreaFormatter(
          modifiedTreatedAreaHa,
        );
        return {
          ...row,
          treatedAreaHa: modifiedTreatedAreaHa,
          treatedAreaLabel: updatedTreatedAreaFormatter.format(),
        };
      }
      return row;
    });
  }, [filteredUnits, treatedAreaHaMap]);

  const handleUnitSelectionChange = useCallback(
    (rows: Array<Record<string, unknown>>) => {
      const ids = rows
        .map((row) => {
          const data = row as Partial<ProductionUnitTableRow>;
          return data.id;
        })
        .filter((id): id is string => Boolean(id));
      setSelectedUnitIds(ids);
    },
    [],
  );

  const handleUnitTableSave = useCallback(
    (payload: {
      created: Array<Record<string, unknown>>;
      updated: Array<Record<string, unknown>>;
    }) => {
      // Aggiorna treatedAreaHaMap con i valori modificati
      const allRows = [...payload.created, ...payload.updated];
      setTreatedAreaHaMap((prev) => {
        const updated = new Map(prev);
        allRows.forEach((row) => {
          const data = row as Partial<ProductionUnitTableRow>;
          if (data.id && data.treatedAreaHa !== undefined) {
            updated.set(data.id, data.treatedAreaHa);
          }
        });
        return updated;
      });
    },
    [],
  );

  const handleProductSelectionChange = useCallback(
    (rows: Array<Record<string, unknown>>) => {
      const ids = rows
        .map((row) => {
          // Use _internalId for unique identification
          const internalId = row._internalId as string | undefined;
          if (internalId) {
            return internalId;
          }
          // Fallback to old method for backward compatibility
          const productName = row.productName as string | undefined;
          const registrationNumber = row.registrationNumber as
            | string
            | undefined;
          if (productName && registrationNumber) {
            return `${productName}-${registrationNumber}`;
          }
          return null;
        })
        .filter((id): id is string => Boolean(id));
      setSelectedProductIds(ids);
    },
    [],
  );

  const handleActiveJobsSelectionChange = useCallback(
    (rows: Array<Record<string, unknown>>) => {
      const ids = rows.map((row) => ActiveJobsTableRowBuilder.extractId(row));
      setSelectedActiveJobIds(ids);
    },
    [],
  );

  const handleImportFromWarehouse = useCallback(async () => {
    if (isWarehouseProductsLoading || isImportingFromWarehouse) {
      return;
    }

    if (selectedCompanyIds.length === 0) {
      toast.error("Nessuna azienda selezionata", {
        description:
          "Seleziona almeno un'azienda prima di importare i prodotti dal magazzino.",
      });
      return;
    }

    if (!warehouseInventory || warehouseInventory.length === 0) {
      toast.info("Nessun prodotto disponibile in magazzino", {
        description: "Aggiungi prodotti in magazzino prima di importarli.",
      });
      return;
    }

    // Filter products by selected companies
    const companyProducts = warehouseInventory.filter((product) =>
      selectedCompanyIds.includes(product.warehouse.company.id),
    );

    if (companyProducts.length === 0) {
      toast.info("Nessun prodotto disponibile per questa azienda", {
        description:
          "Non ci sono prodotti in magazzino per l'azienda selezionata.",
      });
      return;
    }

    setIsImportingFromWarehouse(true);
    const toastId = toast.loading("Caricamento prodotti da magazzino...", {
      description: "Elaborazione in corso...",
    });

    let mappedProducts: DosageProduct[] = [];
    try {
      toast.loading("Recupero prodotti dal magazzino...", {
        id: toastId,
        description: `Analisi di ${companyProducts.length} prodotti...`,
      });

      mappedProducts =
        await WarehouseProductsMapper.toDosageProducts(companyProducts);

      toast.loading("Elaborazione prodotti...", {
        id: toastId,
        description: `Elaborazione di ${mappedProducts.length} prodotti...`,
      });
    } catch (error) {
      console.error("Failed to import warehouse products:", error);
      toast.error("Importazione dal magazzino non riuscita", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "Riprova più tardi.",
      });
      setIsImportingFromWarehouse(false);
      return;
    }

    if (mappedProducts.length === 0) {
      toast.info("Nessun prodotto importabile", {
        id: toastId,
        description: "I prodotti disponibili non hanno quantità valide.",
      });
      setIsImportingFromWarehouse(false);
      return;
    }

    toast.loading("Aggiunta prodotti alla tabella...", {
      id: toastId,
      description: `Aggiunta di ${mappedProducts.length} prodotti...`,
    });

    let importedCount = 0;
    setProducts((prev) => {
      const existingKeys = new Set(
        prev.map((product) => DosageProductKeyBuilder.build(product)),
      );
      const uniqueProducts = mappedProducts.filter((product) => {
        const key = DosageProductKeyBuilder.build(product);
        return !existingKeys.has(key);
      });

      importedCount = uniqueProducts.length;
      if (uniqueProducts.length === 0) {
        return prev;
      }

      // Add _internalId to imported products
      const productsWithIds: ProductWithInternalId[] = uniqueProducts.map(
        (product) => ({
          ...product,
          _internalId: `product-${Date.now()}-${++productIdCounterRef.current}`,
        }),
      );

      // Traccia la provenienza dei prodotti importati da magazzino
      setProductSources((prevSources) => {
        const updated = new Map(prevSources);
        productsWithIds.forEach((product) => {
          const key = DosageProductKeyBuilder.build(product);
          updated.set(key, "warehouse");
        });
        return updated;
      });

      return [...prev, ...productsWithIds];
    });

    setIsImportingFromWarehouse(false);

    if (importedCount === 0) {
      toast.info("Tutti i prodotti di magazzino sono già presenti", {
        id: toastId,
        description:
          "Rimuovi quelli non necessari oppure aggiorna il magazzino.",
      });
      return;
    }

    toast.success("Prodotti importati dal magazzino", {
      id: toastId,
      description: `${importedCount} prodotti aggiunti alla tabella`,
    });
  }, [
    isWarehouseProductsLoading,
    isImportingFromWarehouse,
    warehouseInventory,
    selectedCompanyIds,
  ]);

  const handleImportFromNotes = useCallback(async () => {
    if (isImportingFromNotes) {
      return;
    }

    if (selectedCompanyIds.length === 0) {
      toast.error("Nessuna azienda selezionata", {
        description:
          "Seleziona almeno un'azienda prima di importare i prodotti da note.",
      });
      return;
    }

    setIsImportingFromNotes(true);
    const toastId = toast.loading("Caricamento prodotti da note...", {
      description: `Recupero prodotti per ${selectedCompanyIds.length} aziend${selectedCompanyIds.length === 1 ? "a" : "e"}...`,
    });

    try {
      // Fetch verified phytosanitary products for each selected company
      const allProducts: VerifiedPhytosanitaryProduct[] = [];

      for (const companyId of selectedCompanyIds) {
        try {
          const response =
            await productsApiService.getVerifiedPhytosanitary(companyId);

          if (response.status === "error") {
            console.error(
              `Error fetching products for company ${companyId}:`,
              response.message,
            );
            continue;
          }

          if (response.data?.products && response.data.products.length > 0) {
            allProducts.push(...response.data.products);
          }
        } catch (error) {
          console.error(
            `Failed to fetch products for company ${companyId}:`,
            error,
          );
        }
      }

      if (allProducts.length === 0) {
        toast.info("Nessun prodotto trovato", {
          id: toastId,
          description:
            "Non sono stati trovati prodotti fitosanitari verificati per le aziende selezionate.",
        });
        setIsImportingFromNotes(false);
        return;
      }

      toast.loading("Elaborazione prodotti...", {
        id: toastId,
        description: `Elaborazione di ${allProducts.length} prodotti...`,
      });

      // Map verified phytosanitary products to DosageProduct format
      const mappedProducts: DosageProduct[] = allProducts
        .map((product) => {
          // Calculate net quantity from stocks
          const netQuantity = product.stocks.reduce((total, stock) => {
            const quantity = stock.quantity ?? 0;
            return stock.type === "IN" ? total + quantity : total - quantity;
          }, 0);

          const unitOfMeasure =
            product.stocks[0]?.unitOfMeasureQuantity || "kg";

          return {
            productName: product.name,
            registrationNumber: product.registrationNumber || "",
            quantity: netQuantity > 0 ? netQuantity : 0,
            quantityUnitOfMeasure: unitOfMeasure,
            loadWarehouse: true,
            supplierName: product.warehouse.company.name,
          };
        })
        .filter((product) => product.quantity > 0);

      if (mappedProducts.length === 0) {
        toast.info("Nessun prodotto importabile", {
          id: toastId,
          description: "I prodotti trovati non hanno quantità valide.",
        });
        setIsImportingFromNotes(false);
        return;
      }

      let importedCount = 0;
      setProducts((prev) => {
        const existingKeys = new Set(
          prev.map((product) => DosageProductKeyBuilder.build(product)),
        );
        const uniqueProducts = mappedProducts.filter((product) => {
          const key = DosageProductKeyBuilder.build(product);
          return !existingKeys.has(key);
        });

        importedCount = uniqueProducts.length;
        if (uniqueProducts.length === 0) {
          return prev;
        }

        // Add _internalId to imported products
        const productsWithIds: ProductWithInternalId[] = uniqueProducts.map(
          (product) => ({
            ...product,
            _internalId: `product-${Date.now()}-${++productIdCounterRef.current}`,
          }),
        );

        // Track the source of imported products as "notes"
        setProductSources((prevSources) => {
          const updated = new Map(prevSources);
          productsWithIds.forEach((product) => {
            const key = DosageProductKeyBuilder.build(product);
            updated.set(key, "notes");
          });
          return updated;
        });

        return [...prev, ...productsWithIds];
      });

      setIsImportingFromNotes(false);

      if (importedCount === 0) {
        toast.info("Tutti i prodotti da note sono già presenti", {
          id: toastId,
          description:
            "Rimuovi quelli non necessari oppure importa nuovi prodotti.",
        });
        return;
      }

      toast.success("Prodotti importati da note", {
        id: toastId,
        description: `${importedCount} prodotti aggiunti alla tabella`,
      });
    } catch (error) {
      console.error("Failed to import products from notes:", error);
      toast.error("Importazione da note non riuscita", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "Riprova più tardi.",
      });
      setIsImportingFromNotes(false);
    }
  }, [isImportingFromNotes, selectedCompanyIds]);

  const handleSelectImportMethod = useCallback((method: ImportMethod) => {
    setSelectedImportMethod((current) => {
      if (ImportMethodPolicy.canSelect(current, method)) {
        return method;
      }
      return current;
    });
  }, []);

  const handleResetImportMethod = useCallback(() => {
    setSelectedImportMethod(null);
  }, []);

  const selectedCompanyNames = useMemo(() => {
    if (selectedCompanyIds.length === 0) {
      return [];
    }
    return companies
      .filter((company) => selectedCompanyIds.includes(company.id))
      .map((company) => company.name);
  }, [companies, selectedCompanyIds]);

  const selectedUnitsCount = selectedUnitIds.length;
  const selectedProductsCount = selectedProductIds.length;
  const isCalculateDisabled =
    isSubmitting || selectedProductsCount === 0 || selectedUnitsCount === 0;

  // Calcola il valore di default di outStockLimiter basato sulla provenienza dei prodotti
  const defaultOutStockLimiter = useMemo(() => {
    if (products.length === 0) {
      return true; // Default a true se non ci sono prodotti
    }

    // Se tutti i prodotti provengono da magazzino, default è false
    // Se almeno uno proviene da CSV/DDT, default è true
    const hasWarehouseOnly = products.every((product) => {
      const key = `${product.productName}-${product.registrationNumber}`;
      return productSources.get(key) === "warehouse";
    });

    return !hasWarehouseOnly;
  }, [products, productSources]);

  // Aggiorna outStockLimiter quando cambia la composizione dei prodotti
  useEffect(() => {
    setOutStockLimiter(defaultOutStockLimiter);
  }, [defaultOutStockLimiter]);

  // Sincronizza selectedProductIds quando i prodotti vengono rimossi
  useEffect(() => {
    setSelectedProductIds((prev) => {
      return prev.filter((productId) => {
        const [productName, registrationNumber] = productId.split("-", 2);
        return products.some(
          (p) =>
            p.productName === productName &&
            p.registrationNumber === registrationNumber,
        );
      });
    });
  }, [products]);

  const selectionSummary = useMemo(() => {
    const unitLabel =
      selectedUnitsCount === 1
        ? "1 unità produttiva"
        : `${selectedUnitsCount} unità produttive`;
    const productLabel =
      selectedProductsCount === 1
        ? "1 prodotto"
        : `${selectedProductsCount} prodotti`;
    if (selectedCompanyNames.length > 0) {
      const companiesLabel =
        selectedCompanyNames.length === 1
          ? selectedCompanyNames[0]
          : `${selectedCompanyNames.length} aziende`;
      return `Selezionati per ${companiesLabel}: ${unitLabel} e ${productLabel}`;
    }
    return `Selezionati: ${unitLabel} e ${productLabel}`;
  }, [selectedCompanyNames, selectedProductsCount, selectedUnitsCount]);

  const handleShowJobDetails = useCallback(
    async (job: DosageJob) => {
      if (isJobDetailsLoading && selectedJob?.id === job.id) {
        return;
      }

      setSelectedJob(job);
      setIsJobDetailsLoading(true);

      try {
        const detailedJob = await dosageJobDetailsManager.load(job);
        const normalized = normalizeJob(detailedJob);
        setSelectedJob(normalized);
        setJobs((prev) =>
          prev.map((existingJob) =>
            existingJob.id === normalized.id ? normalized : existingJob,
          ),
        );
      } catch (error) {
        toast.error("Impossibile caricare i dettagli del job", {
          description:
            error instanceof Error ? error.message : "Riprova più tardi",
        });
      } finally {
        setIsJobDetailsLoading(false);
      }
    },
    [isJobDetailsLoading, selectedJob],
  );

  const historyJobColumns = useMemo<EditableColumn[]>(() => {
    return [
      {
        id: "jobId",
        title: "Job ID",
        width: "200px",
        type: "text",
      },
      {
        id: "createdAtLabel",
        title: "Data Creazione",
        width: "220px",
        type: "text",
      },
      {
        id: "stateLabel",
        title: "Stato",
        width: "160px",
        render: (_value, row) => JobStateBadgeRenderer.render(row),
      },
      {
        id: "progress",
        title: "Avanzamento",
        width: "220px",
        render: (_value, row) => JobProgressIndicatorRenderer.render(row),
      },
      {
        id: "productsCount",
        title: "Prodotti",
        width: "140px",
        type: "number",
      },
      {
        id: "unitsCount",
        title: "Unità",
        width: "120px",
        type: "number",
      },
      {
        id: "liveActions",
        title: "Live",
        width: "120px",
        render: (_value, row) => {
          const typedRow = row as JobHistoryTableRow;
          const isPendingOrActive =
            typedRow.state === "queued" ||
            typedRow.state === "waiting" ||
            typedRow.state === "active" ||
            typedRow.state === "delayed";
          const isCurrentlyLive =
            isLiveLogsDrawerOpen && liveLogsJobId === typedRow.jobId;

          if (!isPendingOrActive) {
            return null;
          }

          return (
            <Button
              variant={isCurrentlyLive ? "default" : "outline"}
              size="sm"
              className={
                isCurrentlyLive
                  ? "gap-2 bg-green-600 text-white hover:bg-green-700"
                  : "gap-2 text-green-600 border-green-600 hover:bg-green-50"
              }
              onClick={(e) => {
                e.stopPropagation();
                if (isCurrentlyLive) {
                  handleCloseLiveLogs();
                } else {
                  handleOpenLiveLogs(typedRow.jobId);
                }
              }}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Live</span>
            </Button>
          );
        },
      },
      {
        id: "actions",
        title: "Azioni",
        width: "140px",
        render: (_value, row) => {
          const typedRow = row as JobHistoryTableRow;
          return (
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-600 hover:text-neutral-900"
              onClick={(event) => {
                event.stopPropagation();
                void handleShowJobDetails(typedRow.job);
              }}
            >
              Dettagli
            </Button>
          );
        },
      },
    ];
  }, [
    handleShowJobDetails,
    isLiveLogsDrawerOpen,
    liveLogsJobId,
    handleOpenLiveLogs,
    handleCloseLiveLogs,
  ]);

  const handleCancelJobs = useCallback(
    async (jobIds: string[]) => {
      const uniqueIds = [...new Set(jobIds.filter((jobId) => Boolean(jobId)))];
      if (uniqueIds.length === 0) {
        return;
      }

      setIsCancellingJobs(true);

      try {
        const updatedJobs =
          await dosageJobCancellationService.cancel(uniqueIds);
        setJobs(updatedJobs);

        if (selectedJob && uniqueIds.includes(selectedJob.id)) {
          setSelectedJob(null);
        }

        toast.success("Elaborazioni annullate", {
          description: `${uniqueIds.length} job annullati correttamente`,
        });
      } catch (error) {
        toast.error("Impossibile annullare i job", {
          description:
            error instanceof Error ? error.message : "Riprova più tardi",
        });
      } finally {
        setIsCancellingJobs(false);
      }
    },
    [selectedJob],
  );

  const handleCancelSelectedActiveJobs = useCallback(() => {
    if (selectedActiveJobIds.length === 0 || isCancellingJobs) {
      return;
    }
    void handleCancelJobs(selectedActiveJobIds);
  }, [handleCancelJobs, isCancellingJobs, selectedActiveJobIds]);

  const handleCalculateDosages = async () => {
    if (selectedProductIds.length === 0) {
      toast.error("Nessun prodotto selezionato", {
        description:
          "Seleziona almeno un prodotto prima di calcolare i dosaggi",
      });
      return;
    }

    if (selectedUnitIds.length === 0) {
      toast.error("Nessuna unità produttiva selezionata", {
        description:
          "Seleziona almeno un'unità produttiva prima di calcolare i dosaggi",
      });
      return;
    }

    // Validate date range against selected units (with 3 months buffer)
    if (startAt || endAt) {
      if (endAt && startAt && endAt < startAt) {
        toast.error("Date non valide", {
          description:
            "La data di fine non può essere prima della data di inizio",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Get treatedAreaHa from the first selected unit (or use areaHa if not modified)
      // If multiple units are selected, use the treatedAreaHa of the first one
      const firstSelectedUnitRow = productionUnitTableRows.find((row) =>
        selectedUnitIds.includes(row.id),
      );
      const treatedAreaHa =
        firstSelectedUnitRow?.treatedAreaHa ??
        firstSelectedUnitRow?.areaHa ??
        undefined;

      // Filter products to only include selected ones using _internalId
      const selectedProducts = products
        .filter((product) => {
          return selectedProductIds.includes(product._internalId);
        })
        .map((product) => {
          // Remove _internalId before sending to API and apply global loadWarehouse setting
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _internalId, ...productWithoutId } = product;
          const productPayload: DosageProduct = {
            ...productWithoutId,
            loadWarehouse,
          };

          // Add treatedAreaHa if available and valid
          if (treatedAreaHa !== undefined && treatedAreaHa > 0) {
            // Limit treatedAreaHa to areaHa if it exceeds it
            const maxAreaHa = firstSelectedUnitRow?.areaHa ?? treatedAreaHa;
            productPayload.treatedAreaHa = Math.min(treatedAreaHa, maxAreaHa);
          }

          return productPayload;
        });

      // Prepare units of production
      const unitsOfProduction: DosageUnitOfProduction[] = selectedUnits.map(
        (unit) => ({
          id: unit.productionUnit.id,
          name: unit.productionUnit.name,
          cropName: unit.productionUnit.cropName,
          cropType: unit.productionUnit.cropType,
          variety: unit.productionUnit.variety,
          cropVariety: unit.productionUnit.variety,
          areaHa: unit.productionUnit.areaHa,
          startDate: unit.productionUnit.startDate,
          floweringDate: unit.productionUnit.floweringDate,
          harvestingDate: unit.productionUnit.harvestingDate,
          endDate: unit.productionUnit.endDate,
          protocoll: unit.productionUnit.protocoll,
          protectionStructure: unit.productionUnit.protectionStructure,
          disciplinari: [], // TODO: get from unit if available
          occupazione: unit.productionUnit.occupazione,
          destinazioneDiUso: unit.productionUnit.destinazioneDiUso,
          acquaTotalePeridoL: unit.productionUnit.acquaTotalePeridoL,
        }),
      );

      // Prepare request payload
      const requestPayload: Parameters<
        typeof dosageAgentApiService.startJob
      >[0] = {
        products: selectedProducts,
        unitOfProduction: unitsOfProduction,
        strategy,
        outStockLimiter,
        orchestrator: OrchestratorRequestBuilder.build(
          orchestratorSettings,
          orchestratorDatasets,
        ),
      };

      // Add optional date fields if provided
      if (startAt) {
        requestPayload.startAt = startAt;
      }
      if (endAt) {
        requestPayload.endAt = endAt;
      }

      // Start job
      const response = await dosageAgentApiService.startJob(requestPayload);

      const jobId = response.data.jobId;

      // Reload jobs from API
      await fetchJobsFromApi();

      // Invalida la cache di React Query per i job groups quando si avvia un nuovo job
      // Non fa refetch automatico, solo marca come stale
      queryClient.invalidateQueries({
        queryKey: ["job-groups-summary"],
        refetchType: "none", // Non fare refetch automatico
      });
      queryClient.invalidateQueries({
        queryKey: ["job-group-detail"],
        refetchType: "none", // Non fare refetch automatico
      });

      toast.success("Calcolo dosaggi avviato", {
        description: `Job ID: ${jobId}`,
      });

      // Reset form fields
      setSelectedCompanyIds([]);
      setProducts([]);
      setProductSources(new Map());
      setSelectedImportMethod(null);
      setStrategy("avg");
      setOutStockLimiter(true);
      setLoadWarehouse(false);
      setOrchestratorSettings(OrchestratorDefaultsFactory.create());
      setSelectedUnitIds([]);
      setSelectedProductIds([]);
      setSearchQuery("");
      setStartAt("");
      setEndAt("");
      setTreatedAreaHaMap(new Map());
    } catch (error) {
      toast.error("Errore durante l'avvio del calcolo", {
        description:
          error instanceof Error ? error.message : "Riprova più tardi",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalUnits = productionUnits.length;

  const orchestratorSummary = useMemo(() => {
    const objective = orchestratorSettings.objective ?? "balanced";
    const intensity = orchestratorSettings.intensity ?? null;
    const cats = orchestratorSettings.categoryPriority?.length ?? 0;
    const targets = orchestratorSettings.priorityTargets?.length ?? 0;
    const llm = true;
    return {
      objectiveLabel: OrchestratorLabels.objective(objective),
      intensityLabel: intensity
        ? OrchestratorLabels.intensity(intensity)
        : "Nessun limite",
      categoriesCount: cats,
      targetsCount: targets,
      llm,
    };
  }, [orchestratorSettings]);

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader
        className="fixed top-0 right-0 z-30 bg-white"
        style={{
          left: isMobile
            ? 0
            : sidebarState === "collapsed"
              ? "calc(var(--sidebar-width-icon) + 1rem)"
              : "var(--sidebar-width)",
        }}
        title="Genera Dosaggi"
        totalItems={totalUnits}
        filteredItems={filteredUnits.length}
      >
        <Button
          variant={isHistoryPage ? "default" : "ghost"}
          onClick={historyButtonAction}
          className={
            isHistoryPage
              ? "gap-2 bg-blue-600 text-white hover:bg-blue-700"
              : "gap-2 text-neutral-500 hover:text-neutral-700"
          }
        >
          {isHistoryPage ? (
            <ArrowLeft className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          <span>{historyButtonLabel}</span>
        </Button>
      </PageHeader>

      <div
        className="flex-1 overflow-auto px-4 md:px-6 pt-32 md:pt-28"
        style={{
          paddingBottom: isMobile
            ? Math.max(footerHeight + mobileBottomOccupied + 24, 160) // evita overlay con bottom navbar + footer
            : 160, // desktop: lascia comunque spazio sotto
        }}
      >
        {currentPage === "manage" ? (
          <ManageSection
            companies={companies}
            selectedCompanyIds={selectedCompanyIds}
            setSelectedCompanyIds={setSelectedCompanyIds}
            selectedUnitIds={selectedUnitIds}
            setSelectedUnitIds={setSelectedUnitIds}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            loadingUnits={loadingUnits}
            filteredUnits={filteredUnits}
            productionUnitTableColumns={productionUnitTableColumns}
            productionUnitTableRows={productionUnitTableRows}
            handleUnitSelectionChange={handleUnitSelectionChange}
            handleUnitTableSave={handleUnitTableSave}
            products={products}
            setProducts={setProducts}
            setSelectedProductIds={setSelectedProductIds}
            setProductSources={setProductSources}
            productColumns={productColumns}
            productsAsRows={productsAsRows}
            handleSaveProducts={handleSaveProducts}
            handleDeleteProducts={handleDeleteProducts}
            handleProductSelectionChange={handleProductSelectionChange}
            handleAddRowsFromCsv={handleAddRowsFromCsv}
            handleAddRowsFromDdt={handleAddRowsFromDdt}
            handleImportFromWarehouse={handleImportFromWarehouse}
            handleImportFromNotes={handleImportFromNotes}
            isWarehouseProductsLoading={isWarehouseProductsLoading}
            isImportingFromWarehouse={isImportingFromWarehouse}
            isImportingFromNotes={isImportingFromNotes}
            handleRegistryProductSelected={handleRegistryProductSelected}
            strategy={strategy}
            setStrategy={setStrategy}
            strategyOptions={strategyOptions}
            selectedStrategyOption={selectedStrategyOption}
            outStockLimiter={outStockLimiter}
            setOutStockLimiter={setOutStockLimiter}
            loadWarehouse={loadWarehouse}
            setLoadWarehouse={setLoadWarehouse}
            orchestratorSettings={orchestratorSettings}
            setOrchestratorSettings={setOrchestratorSettings}
            orchestratorDatasets={orchestratorDatasets}
            editableTableRef={editableTableRef}
            renderEmptyProductsPlaceholder={() =>
              dosagePlaceholderRenderer.renderEmptyProductsPlaceholder()
            }
            selectedImportMethod={selectedImportMethod}
            onSelectImportMethod={handleSelectImportMethod}
            onResetImportMethod={handleResetImportMethod}
            startAt={startAt}
            setStartAt={setStartAt}
            endAt={endAt}
            setEndAt={setEndAt}
          />
        ) : (
          <HistorySection
            activeJobsCount={activeJobs.length}
            activeSelectionLabel={activeSelectionLabel}
            isCancellingJobs={isCancellingJobs}
            selectedActiveJobIds={selectedActiveJobIds}
            onCancelSelectedActiveJobs={handleCancelSelectedActiveJobs}
            activeJobColumns={activeJobColumns}
            activeJobRows={activeJobRows}
            onActiveSelectionChange={handleActiveJobsSelectionChange}
            historyJobColumns={historyJobColumns}
            historyJobRows={historyJobRows}
            onOpenJobDetails={(job) => void handleShowJobDetails(job)}
          />
        )}
      </div>

      <div
        ref={footerRef}
        className="fixed bottom-0 right-0 z-40 flex-shrink-0  bg-white/95 backdrop-blur px-4 md:px-6 py-4 mb-4 shadow-md rounded-md"
        style={{
          bottom: isMobile ? mobileBottomOccupied : undefined,
          left: isMobile
            ? 0
            : sidebarState === "collapsed"
              ? "calc(var(--sidebar-width-icon) + 1rem)"
              : "var(--sidebar-width)",
          marginBottom: isMobile ? 0 : undefined,
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="hidden md:block">
            <p className="text-sm text-neutral-500">
              {selectedCompanyNames.length > 0
                ? `Aziend${
                    selectedCompanyNames.length === 1 ? "a" : "e"
                  } selezionat${
                    selectedCompanyNames.length === 1 ? "a" : "e"
                  }: ${selectedCompanyNames.join(", ")}`
                : "Nessuna azienda selezionata"}
            </p>
            <p className="text-sm text-neutral-500">
              Strategia selezionata: {selectedStrategyOption.label}
            </p>
            <p className="text-sm text-neutral-500">
              Orchestrator: {orchestratorSummary.objectiveLabel} •{" "}
              {orchestratorSummary.intensityLabel} • cat.{" "}
              {orchestratorSummary.categoriesCount} • target{" "}
              {orchestratorSummary.targetsCount} • LLM{" "}
              {orchestratorSummary.llm ? "ON" : "OFF"}
            </p>
            <p className="text-base font-medium text-neutral-900">
              {selectionSummary}
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleCalculateDosages}
            disabled={isCalculateDisabled}
            className="gap-2 w-full md:w-auto min-w-48 md:self-end"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Calcolo...</span>
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4" />
                <span>Calcola Dosaggi</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <JobDetails
        selectedJob={selectedJob}
        onSelectedJobChange={setSelectedJob}
        jobDetailsLoading={isJobDetailsLoading}
      />

      {/* Live Logs Drawer */}

      <JobDetails
        selectedJob={selectedJob}
        onSelectedJobChange={setSelectedJob}
        jobDetailsLoading={isJobDetailsLoading}
      />

      {/* Live Logs Drawer */}
      <Drawer
        open={isLiveLogsDrawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseLiveLogs();
          }
        }}
      >
        <DrawerContent data-vaul-drawer-direction="right">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-green-600 animate-pulse" />
                  Log Live
                </DrawerTitle>
                <DrawerDescription>
                  {liveLogsJobId
                    ? `Job ID: ${liveLogsJobId}`
                    : "Nessun job selezionato"}
                </DrawerDescription>
              </div>
              <Badge
                variant={
                  liveSocketState === "connected"
                    ? "default"
                    : liveSocketState === "connecting"
                      ? "secondary"
                      : "destructive"
                }
                className="flex items-center gap-1.5"
              >
                {liveSocketState === "connected" ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Connesso</span>
                  </>
                ) : liveSocketState === "connecting" ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Connessione...</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Disconnesso</span>
                  </>
                )}
              </Badge>
            </div>
          </DrawerHeader>
          <div
            ref={liveLogsScrollRef}
            className="flex-1 overflow-y-auto px-6 pb-6 max-h-[calc(100vh-200px)]"
          >
            {liveLogEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                {liveSocketState === "connected" ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p className="text-sm font-medium">
                      In attesa di eventi...
                    </p>
                    <p className="text-xs mt-1">
                      I log appariranno qui man mano che il job avanza
                    </p>
                  </>
                ) : liveSocketState === "connecting" ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p className="text-sm font-medium">
                      Connessione in corso...
                    </p>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-8 w-8 mb-4" />
                    <p className="text-sm font-medium">Non connesso</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {liveLogEvents.map((event, index) => (
                  <LiveLogEventCard key={`live-log-${index}`} event={event} />
                ))}
              </div>
            )}
          </div>
          <DrawerFooter className="flex flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                clearLiveLogEvents();
                // Scroll to top after clearing
                setTimeout(() => {
                  liveLogsScrollRef.current?.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }, 50);
                toast.info("Log puliti", {
                  description:
                    "I log sono stati rimossi dalla visualizzazione. La connessione live rimane attiva.",
                });
              }}
              disabled={liveLogEvents.length === 0}
            >
              Pulisci log
            </Button>
            <DrawerClose asChild>
              <Button variant="default" className="flex-1">
                Chiudi
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
