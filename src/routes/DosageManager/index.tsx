import type { ChangeEvent, ReactElement } from "react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import { useCompanies } from "@/hooks/useCompanies";
import { useProducts } from "@/hooks/useProducts";
import { ImportProducts } from "./importProducts";
import { ImportProductsFromDdt } from "./importProductsFromDdt";
import { FitosanitariProductSearch } from "./FitosanitariProductSearch";
import { PageHeader } from "@/components/organism/Header";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Loader2,
  Calculator,
  CheckCircle2,
  Clock,
  Apple,
  Package,
  FileText,
  Trash2,
  Octagon,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  dosageAgentApiService,
  type DosageProduct,
  type DosageStrategy,
  type DosageUnitOfProduction,
} from "@/api/dosage-agent";
import {
  productLabelsApiService,
  type ProductLabelDetails,
  type ProductLabelStructuredData,
} from "@/api/product-labels";
import type { ProductionUnit } from "@/api/production-unit";
import type { Product } from "@/api/products";
import {
  dosageJobsIndexDBManager,
  type DosageJob,
} from "@/utils/dosageJobsIndexDBManager";
import { JobDetails } from "./JobDetails";
import {
  type FitosanitariDatasetRecord,
  findRegNumberByName,
} from "@/services/fitosanitariRegistry";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
class DosageJobDetailsManager {
  public async load(job: DosageJob): Promise<DosageJob> {
    if (job.state === "completed" && job.result) {
      return job;
    }

    try {
      const statusResponse = await dosageAgentApiService.getJobStatus(job.id);
      const statusData = statusResponse.data;

      try {
        await dosageJobsIndexDBManager.updateJob(job.id, {
          state: statusData.state,
          progress: statusData.progress,
          result: statusData.result,
          productsCount: statusData.data?.productsCount ?? job.productsCount,
          unitsCount: statusData.data?.unitsCount ?? job.unitsCount,
          error:
            statusData.state === "failed"
              ? "The dosage job has failed"
              : undefined,
        });

        const refreshedJob = await dosageJobsIndexDBManager.getJob(job.id);
        if (refreshedJob) {
          return refreshedJob;
        }
      } catch (synchronizationError) {
        console.error(
          "Failed to synchronize job details:",
          synchronizationError
        );
      }

      return {
        ...job,
        state: statusData.state,
        progress: statusData.progress,
        result: statusData.result,
        productsCount: statusData.data?.productsCount ?? job.productsCount,
        unitsCount: statusData.data?.unitsCount ?? job.unitsCount,
        updatedAt: new Date(),
        error:
          statusData.state === "failed"
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
  private readonly storage = dosageJobsIndexDBManager;

  constructor(api: typeof dosageAgentApiService = dosageAgentApiService) {
    this.api = api;
  }

  public async cancel(jobIds: string[]): Promise<DosageJob[]> {
    const uniqueIds = [...new Set(jobIds.filter((id) => Boolean(id)))];

    if (uniqueIds.length === 0) {
      return await this.storage.getAllJobs();
    }

    await this.api.cancelJobs(uniqueIds);

    await Promise.all(
      uniqueIds.map(async (jobId) => {
        try {
          await this.storage.deleteJob(jobId);
        } catch (error) {
          console.error(
            `Failed to remove job ${jobId} from IndexedDB after cancellation`,
            error
          );
        }
      })
    );

    return await this.storage.getAllJobs();
  }
}

const dosageJobCancellationService = new DosageJobCancellationService();

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

interface ActiveJobTableRow extends Record<string, unknown> {
  id: string;
  jobId: string;
  createdAtLabel: string;
  state: DosageJob["state"];
  stateLabel: string;
  stateBadgeVariant: BadgeVariant;
  progress: number;
  progressLabel: string;
  productsCount: number;
  unitsCount: number;
}

class ActiveJobStateDescriptor {
  private static readonly variants: Record<
    DosageJob["state"],
    { label: string; variant: BadgeVariant }
  > = {
    waiting: { label: "In attesa", variant: "secondary" },
    active: { label: "In esecuzione", variant: "default" },
    completed: { label: "Completato", variant: "default" },
    failed: { label: "Fallito", variant: "destructive" },
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
      const createdAt =
        job.createdAt instanceof Date ? job.createdAt : new Date(job.createdAt);

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
  public static render(row: Record<string, unknown>): ReactElement {
    const data = row as {
      state: DosageJob["state"];
      progressLabel: string;
    };

    if (data.state === "waiting" || data.state === "active") {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <img
            src="/logo.png"
            alt="Seminai Logo"
            className="h-6 w-6 animate-spin"
          />
        </div>
      );
    }

    if (data.state === "failed") {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-red-600">
          <Octagon className="h-4 w-4" />
          <span>STOP</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center gap-2 text-sm text-green-600">
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

interface JobHistoryTableRow extends ActiveJobTableRow {
  job: DosageJob;
}

class JobHistoryTableRowBuilder {
  public static build(jobs: DosageJob[]): JobHistoryTableRow[] {
    return [...jobs]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map((job) => {
        const descriptor = ActiveJobStateDescriptor.describe(job.state);
        const createdAt =
          job.createdAt instanceof Date
            ? job.createdAt
            : new Date(job.createdAt);

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

  public static buildCurlSnippet(strategy: DosageStrategy): string {
    return [
      "curl -X POST https://<host>/dosage-agent/start-job \\",
      "",
      '  -H "Authorization: Bearer <JWT_TOKEN>" \\',
      "",
      '  -H "Content-Type: application/json" \\',
      "",
      "  -d '{",
      '        "products": [',
      "          {",
      '            "productId": "123",',
      '            "quantity": 100,',
      '            "quantityUnitOfMeasure": "kg",',
      '            "loadWarehouse": true',
      "          }",
      "        ],",
      '        "unitOfProduction": [',
      "          {",
      '            "id": "unit-001",',
      '            "cropName": "Vite",',
      '            "cropVariety": "Trebbiano",',
      '            "disciplinari": ["disciplinare-2025"]',
      "          }",
      "        ],",
      `        "strategy": "${strategy}"`,
      "      }'",
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
        unit.productionUnit.areaHa
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
      },
      {
        id: "variety",
        title: "Varietà",
        width: "200px",
        render: (_value, row) =>
          ProductionUnitTableColumnsFactory.renderVariety(row),
      },
      {
        id: "protectionStructure",
        title: "Struttura di Protezione",
        width: "220px",
        render: (_value, row) =>
          ProductionUnitTableColumnsFactory.renderStructure(row),
      },
      {
        id: "areaHa",
        title: "Superficie",
        width: "160px",
        render: (_value, row) =>
          ProductionUnitTableColumnsFactory.renderArea(row),
      },
      {
        id: "fieldsCount",
        title: "Campi",
        width: "120px",
        render: (_value, row) =>
          ProductionUnitTableColumnsFactory.renderFields(row),
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
        <p className="text-xs text-neutral-500">{data.companyName}</p>
      </div>
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

  private static renderStructure(row: Record<string, unknown>): ReactElement {
    const data = ProductionUnitTableColumnsFactory.asRow(row);

    return (
      <span className="text-sm text-neutral-700">
        {data.protectionStructure || "-"}
      </span>
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
    registryLookup: typeof findRegNumberByName = findRegNumberByName
  ) {
    this.registryLookup = registryLookup;
  }

  public async resolve(
    productName: string,
    fallbackCandidates: Array<string | undefined>
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
        error
      );
    }

    return fallback;
  }
}

class WarehouseProductsMapper {
  private static readonly registrationResolver =
    new WarehouseProductRegistrationResolver();

  public static async toDosageProducts(
    products: Product[]
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
      })
    );

    return mappedProducts.filter((product) => product.quantity > 0);
  }
}

class DosageProductKeyBuilder {
  public static build(product: DosageProduct): string {
    return `${product.productName}-${product.registrationNumber}`;
  }
}

class ProductLabelReference {
  public readonly productName: string;
  public readonly registrationNumber: string;

  private static readonly digitsRegex = /\d+/g;

  private constructor(productName: string, registrationNumber: string) {
    this.productName = productName;
    this.registrationNumber = registrationNumber;
  }

  private static normalize(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value).trim();
  }

  private static normalizeRegistration(value: unknown): string {
    const normalized = this.normalize(value);
    if (!normalized) {
      return "";
    }
    const digits = normalized.match(this.digitsRegex)?.join("") ?? "";
    return digits || normalized;
  }

  public static create(
    productName: unknown,
    registrationNumber: unknown
  ): ProductLabelReference | null {
    const normalizedName = this.normalize(productName);
    const normalizedRegistration =
      this.normalizeRegistration(registrationNumber);
    if (!normalizedName || !normalizedRegistration) {
      return null;
    }
    return new ProductLabelReference(normalizedName, normalizedRegistration);
  }

  public static fromRow(
    row: Record<string, unknown>
  ): ProductLabelReference | null {
    const typedRow = row as {
      productName?: unknown;
      registrationNumber?: unknown;
    };
    return this.create(typedRow.productName, typedRow.registrationNumber);
  }

  public get displayLabel(): string {
    return `${this.productName} • ${this.registrationNumber}`;
  }
}

class ProductLabelLoader {
  private readonly api: typeof productLabelsApiService;

  constructor(api: typeof productLabelsApiService = productLabelsApiService) {
    this.api = api;
  }

  public async load(
    reference: ProductLabelReference
  ): Promise<ProductLabelDetails | null> {
    const response = await this.api.getByProduct({
      name: reference.productName,
      regNumber: reference.registrationNumber,
    });
    return response.data ?? null;
  }
}

class ProductLabelConfidence {
  public static normalize(value: number | null | undefined): number {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return 0;
    }
    if (value < 0) {
      return 0;
    }
    if (value > 100) {
      return 100;
    }
    return Math.round(value);
  }
}

interface ProductLabelDosageDetail extends Record<string, unknown> {
  coltura?: string;
  malattia?: string;
  dose_minima?: number;
  dose_massima?: number;
  dose_um?: string;
  n_max_applicazioni?: number;
  n_max_applicazioni_um?: string;
  intervallo_sicurezza_giorni?: number | null;
  intervallo_min_giorni?: number | null;
  modalita_applicazione?: string;
  istruzioni?: string;
}

interface ProductLabelStructuredPayload extends ProductLabelStructuredData {
  prodotto?: string;
  categoria?: string;
  formulazione?: string;
  principio_attivo?: string;
  composizione?: string;
  compatibilita?: string;
  fitotossicita?: string;
  note_tecniche?: string;
  numero_registrazione?: string;
  titolare?: string;
  stabilimento?: string;
  caratteristiche?: string;
  specie?: string[];
  malattie?: string[];
  colture_target?: string[];
  frasi_pericolo?: string[];
  frasi_prudenza?: string[];
  avvertenze?: string[];
  fasce_di_rispetto_e_deriva?: string[];
  dosaggi_dettagliati?: ProductLabelDosageDetail[];
}

type ProductLabelArrayKey =
  | "specie"
  | "malattie"
  | "colture_target"
  | "frasi_pericolo"
  | "frasi_prudenza"
  | "avvertenze"
  | "fasce_di_rispetto_e_deriva";

type ProductLabelTextKey =
  | "composizione"
  | "compatibilita"
  | "fitotossicita"
  | "note_tecniche"
  | "caratteristiche";

interface ProductLabelInfoPair {
  label: string;
  value: string;
}

interface ProductLabelDescriptiveField {
  title: string;
  value: string;
}

class ProductLabelStructuredAdapter {
  private readonly payload: ProductLabelStructuredPayload;

  constructor(raw: unknown) {
    this.payload =
      raw && typeof raw === "object"
        ? (raw as ProductLabelStructuredPayload)
        : {};
  }

  public get data(): ProductLabelStructuredPayload {
    return this.payload;
  }

  public hasData(): boolean {
    return Object.keys(this.payload).length > 0;
  }

  public getStringList(key: ProductLabelArrayKey): string[] {
    const value = this.payload[key];
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  }

  public getText(key: ProductLabelTextKey): string | null {
    const value = this.payload[key];
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  public getDosageDetails(): ProductLabelDosageDetail[] {
    const value = this.payload.dosaggi_dettagliati;
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((entry) =>
        entry && typeof entry === "object"
          ? (entry as ProductLabelDosageDetail)
          : null
      )
      .filter((entry): entry is ProductLabelDosageDetail => Boolean(entry));
  }
}

class ProductLabelSummaryBuilder {
  private static normalizeText(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  public static buildInfoPairs(
    details: ProductLabelDetails,
    structured: ProductLabelStructuredPayload
  ): ProductLabelInfoPair[] {
    const pairs: Array<[string, string | null]> = [
      ["Prodotto", structured.prodotto ?? details.productName],
      [
        "N. registrazione",
        structured.numero_registrazione ?? details.registrationNumber,
      ],
      ["Categoria", structured.categoria ?? null],
      ["Principio attivo", structured.principio_attivo ?? null],
      ["Formulazione", structured.formulazione ?? null],
      ["Titolare", structured.titolare ?? null],
      ["Stabilimento", structured.stabilimento ?? null],
    ];

    return pairs
      .map(([label, rawValue]) => ({
        label,
        value: this.normalizeText(rawValue),
      }))
      .filter(
        (pair): pair is ProductLabelInfoPair =>
          Boolean(pair.value) && Boolean(pair.label)
      )
      .map((pair) => ({
        label: pair.label,
        value: pair.value ?? "",
      }));
  }

  public static buildDescriptiveFields(
    structured: ProductLabelStructuredPayload
  ): ProductLabelDescriptiveField[] {
    const fields: Array<[string, string | null]> = [
      ["Composizione", structured.composizione ?? null],
      ["Compatibilità", structured.compatibilita ?? null],
      ["Fitotossicità", structured.fitotossicita ?? null],
      ["Note tecniche", structured.note_tecniche ?? null],
      ["Caratteristiche", structured.caratteristiche ?? null],
    ];

    return fields
      .map(([title, rawValue]) => ({
        title,
        value: this.normalizeText(rawValue),
      }))
      .filter((field): field is ProductLabelDescriptiveField =>
        Boolean(field.value)
      )
      .map((field) => ({
        title: field.title,
        value: field.value ?? "",
      }));
  }
}

class ProductLabelDosageFormatter {
  private static formatNumber(value?: number | null): string | null {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }
    return value % 1 === 0 ? value.toString() : value.toFixed(2);
  }

  public static formatDose(detail: ProductLabelDosageDetail): string {
    const min = this.formatNumber(detail.dose_minima);
    const max = this.formatNumber(detail.dose_massima);
    const unit = detail.dose_um ? ` ${detail.dose_um}` : "";

    if (min && max) {
      if (min === max) {
        return `${min}${unit}`.trim();
      }
      return `${min} - ${max}${unit}`.trim();
    }
    if (min) {
      return `${min}${unit}`.trim();
    }
    if (max) {
      return `${max}${unit}`.trim();
    }
    return detail.dose_um ? detail.dose_um : "-";
  }

  public static formatApplications(detail: ProductLabelDosageDetail): string {
    const maxApps = this.formatNumber(detail.n_max_applicazioni);
    if (!maxApps) {
      return "-";
    }
    const unit = detail.n_max_applicazioni_um
      ? ` ${detail.n_max_applicazioni_um}`
      : "";
    return `${maxApps}${unit}`.trim();
  }

  public static formatSafetyInterval(detail: ProductLabelDosageDetail): string {
    const safety = this.formatNumber(detail.intervallo_sicurezza_giorni);
    if (safety) {
      return `${safety} gg`;
    }
    return detail.intervallo_sicurezza_giorni === 0 ? "0 gg" : "-";
  }
}

const productLabelLoader = new ProductLabelLoader();
const MAX_LABEL_DOSAGE_ROWS = 12;

export default function DosageManager() {
  const { productionUnits, isLoading: loadingUnits } = useProductionUnit();
  const { companies } = useCompanies();
  const {
    products: warehouseInventory,
    isLoading: isWarehouseProductsLoading,
  } = useProducts();

  const [currentPage, setCurrentPage] = useState<"manage" | "history">(
    "manage"
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [products, setProducts] = useState<DosageProduct[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [strategy, setStrategy] = useState<DosageStrategy>("avg");

  const editableTableRef = useRef<EditableTable>(null);

  const [jobs, setJobs] = useState<DosageJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<DosageJob | null>(null);
  const [isJobDetailsLoading, setIsJobDetailsLoading] = useState(false);
  const [isCancellingJobs, setIsCancellingJobs] = useState(false);
  const [selectedActiveJobIds, setSelectedActiveJobIds] = useState<string[]>(
    []
  );
  const [isLabelDrawerOpen, setIsLabelDrawerOpen] = useState(false);
  const [labelReference, setLabelReference] =
    useState<ProductLabelReference | null>(null);
  const [labelDetails, setLabelDetails] = useState<ProductLabelDetails | null>(
    null
  );
  const [labelError, setLabelError] = useState<string | null>(null);
  const [isLabelLoading, setIsLabelLoading] = useState(false);
  const labelRequestId = useRef(0);
  const isHistoryPage = currentPage === "history";
  const strategyOptions = useMemo(
    () => DosageStrategyOptionsFactory.create(),
    []
  );
  const selectedStrategyOption = useMemo(
    () => DosageStrategyOptionsFactory.getByValue(strategy),
    [strategy]
  );
  const structuredLabelAdapter = useMemo(
    () => new ProductLabelStructuredAdapter(labelDetails?.label),
    [labelDetails]
  );
  const labelSummaryPairs = useMemo(
    () =>
      labelDetails
        ? ProductLabelSummaryBuilder.buildInfoPairs(
            labelDetails,
            structuredLabelAdapter.data
          )
        : [],
    [labelDetails, structuredLabelAdapter]
  );
  const labelDescriptiveFields = useMemo(
    () =>
      ProductLabelSummaryBuilder.buildDescriptiveFields(
        structuredLabelAdapter.data
      ),
    [structuredLabelAdapter]
  );
  const labelConfidenceValue = useMemo(
    () => ProductLabelConfidence.normalize(labelDetails?.extractionConfidence),
    [labelDetails]
  );
  const labelSpecies = useMemo(
    () => structuredLabelAdapter.getStringList("specie"),
    [structuredLabelAdapter]
  );
  const labelDiseases = useMemo(
    () => structuredLabelAdapter.getStringList("malattie"),
    [structuredLabelAdapter]
  );
  const labelCrops = useMemo(
    () => structuredLabelAdapter.getStringList("colture_target"),
    [structuredLabelAdapter]
  );
  const labelHazardStatements = useMemo(
    () => structuredLabelAdapter.getStringList("frasi_pericolo"),
    [structuredLabelAdapter]
  );
  const labelPrecautionStatements = useMemo(
    () => structuredLabelAdapter.getStringList("frasi_prudenza"),
    [structuredLabelAdapter]
  );
  const labelWarnings = useMemo(
    () => structuredLabelAdapter.getStringList("avvertenze"),
    [structuredLabelAdapter]
  );
  const labelRespectRules = useMemo(
    () => structuredLabelAdapter.getStringList("fasce_di_rispetto_e_deriva"),
    [structuredLabelAdapter]
  );
  const labelDosageDetails = useMemo(
    () => structuredLabelAdapter.getDosageDetails(),
    [structuredLabelAdapter]
  );
  const hasLabelDosageOverflow =
    labelDosageDetails.length > MAX_LABEL_DOSAGE_ROWS;
  const visibleLabelDosages = hasLabelDosageOverflow
    ? labelDosageDetails.slice(0, MAX_LABEL_DOSAGE_ROWS)
    : labelDosageDetails;
  const hasStructuredLabelPayload = structuredLabelAdapter.hasData();
  const labelExtractedFields = useMemo<string[]>(
    () =>
      Array.isArray(labelDetails?.extractedFields)
        ? labelDetails.extractedFields
            .map((item) => String(item).trim())
            .filter((item) => item.length > 0)
        : [],
    [labelDetails]
  );
  const labelQualityExtraction = useMemo<ProductLabelStructuredData[]>(
    () =>
      Array.isArray(labelDetails?.qualityExtraction)
        ? (labelDetails?.qualityExtraction as ProductLabelStructuredData[])
        : [],
    [labelDetails]
  );
  const labelErrors = useMemo<string[]>(
    () =>
      Array.isArray(labelDetails?.errors)
        ? labelDetails?.errors.map((errorItem) => String(errorItem))
        : [],
    [labelDetails]
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
  ];

  // Converte i dati della tabella in DosageProduct[]
  const convertTableRowsToProducts = useCallback(
    (rows: Array<Record<string, unknown>>): DosageProduct[] => {
      return rows.map((row) => ({
        productName: String(row.productName || ""),
        registrationNumber: String(row.registrationNumber || ""),
        quantity: Number(row.quantity) || 0,
        quantityUnitOfMeasure: String(row.quantityUnitOfMeasure || ""),
        loadWarehouse:
          typeof row.loadWarehouse === "boolean" ? row.loadWarehouse : true,
        supplierName: row.supplierName ? String(row.supplierName) : undefined,
        supplierVat: row.supplierVat ? String(row.supplierVat) : undefined,
      }));
    },
    []
  );

  // Gestisce l'aggiunta di righe dalla tabella editabile
  const handleAddRows = useCallback(
    (rows: Array<Record<string, unknown>>): void => {
      if (!editableTableRef.current) {
        return;
      }
      editableTableRef.current.addRows(rows);
      // Aggiorna anche lo stato dei prodotti per mantenere la sincronizzazione
      const newProducts = convertTableRowsToProducts(rows);
      setProducts((prev) => {
        const existingIds = new Set(
          prev.map((p) => `${p.productName}-${p.registrationNumber}`)
        );
        const uniqueNewProducts = newProducts.filter(
          (p) => !existingIds.has(`${p.productName}-${p.registrationNumber}`)
        );
        return [...prev, ...uniqueNewProducts];
      });
    },
    [convertTableRowsToProducts]
  );

  // Gestisce il salvataggio dalla tabella editabile
  const handleSaveProducts = (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }): void => {
    // Converte i prodotti creati e aggiornati
    const createdProducts = convertTableRowsToProducts(payload.created);
    const updatedProducts = convertTableRowsToProducts(payload.updated);

    // Aggiorna lo stato: rimuove quelli aggiornati, aggiunge i nuovi e gli aggiornati
    setProducts((prev) => {
      const updatedIds = new Set(
        updatedProducts.map((p) => `${p.productName}-${p.registrationNumber}`)
      );
      // Rimuove i prodotti aggiornati dalla lista precedente
      const filtered = prev.filter(
        (p) => !updatedIds.has(`${p.productName}-${p.registrationNumber}`)
      );
      // Aggiunge i nuovi prodotti e quelli aggiornati
      return [...filtered, ...createdProducts, ...updatedProducts];
    });

    toast.success("Prodotti salvati", {
      description: `${payload.created.length} creati, ${payload.updated.length} aggiornati`,
    });
  };

  // Gestisce l'eliminazione dalla tabella editabile
  const handleDeleteProducts = (
    removed: Array<Record<string, unknown>>
  ): void => {
    const removedProducts = convertTableRowsToProducts(removed);
    setProducts((prev) =>
      prev.filter(
        (p) =>
          !removedProducts.some(
            (r) =>
              r.productName === p.productName &&
              r.registrationNumber === p.registrationNumber
          )
      )
    );
    toast.info("Prodotti rimossi", {
      description: `${removed.length} prodotti eliminati`,
    });
  };

  // Converte i prodotti in formato per la tabella
  const productsAsRows = useMemo(() => {
    return products.map((product) => ({
      productName: product.productName,
      registrationNumber: product.registrationNumber,
      quantity: product.quantity,
      quantityUnitOfMeasure: product.quantityUnitOfMeasure,
      supplierName: product.supplierName || "",
      supplierVat: product.supplierVat || "",
      loadWarehouse: product.loadWarehouse,
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
    []
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
    [getDefaultUnitOfMeasure]
  );

  const handleLabelDrawerChange = useCallback((open: boolean) => {
    setIsLabelDrawerOpen(open);
    if (!open) {
      labelRequestId.current += 1;
      setLabelDetails(null);
      setLabelReference(null);
      setLabelError(null);
      setIsLabelLoading(false);
    }
  }, []);

  const handleOpenProductLabel = useCallback(
    async (reference: ProductLabelReference) => {
      setIsLabelDrawerOpen(true);
      setLabelReference(reference);
      setLabelDetails(null);
      setLabelError(null);
      setIsLabelLoading(true);

      const currentRequestId = labelRequestId.current + 1;
      labelRequestId.current = currentRequestId;

      try {
        const details = await productLabelLoader.load(reference);
        if (labelRequestId.current !== currentRequestId) {
          return;
        }
        if (!details) {
          setLabelError("Nessuna etichetta disponibile per questo prodotto.");
          return;
        }
        setLabelDetails(details);
      } catch (error) {
        if (labelRequestId.current !== currentRequestId) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Impossibile recuperare l'etichetta";
        setLabelError(message);
      } finally {
        if (labelRequestId.current === currentRequestId) {
          setIsLabelLoading(false);
        }
      }
    },
    []
  );

  const renderProductLabelAction = useCallback(
    (row: Record<string, unknown>): ReactElement => {
      const reference = ProductLabelReference.fromRow(row);
      const disabled = reference === null;

      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-neutral-600"
          onClick={() => {
            if (!reference) {
              return;
            }
            void handleOpenProductLabel(reference);
          }}
          disabled={disabled}
        >
          <FileText className="mr-1 h-3.5 w-3.5" />
          Etichetta
        </Button>
      );
    },
    [handleOpenProductLabel]
  );

  const activeJobs = useMemo(
    () =>
      jobs.filter((job) => job.state === "waiting" || job.state === "active"),
    [jobs]
  );
  const activeJobColumns = useMemo(
    () => ActiveJobsTableColumnsFactory.create(),
    []
  );
  const activeJobRows = useMemo(
    () => ActiveJobsTableRowBuilder.build(activeJobs),
    [activeJobs]
  );
  const historyJobRows = useMemo(
    () => JobHistoryTableRowBuilder.build(jobs),
    [jobs]
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

  // Load jobs from IndexedDB on mount
  useEffect(() => {
    const loadJobs = async () => {
      try {
        const allJobs = await dosageJobsIndexDBManager.getAllJobs();
        setJobs(allJobs);
      } catch (error) {
        console.error("Error loading jobs:", error);
      }
    };

    loadJobs();
  }, []);

  // Poll active jobs
  useEffect(() => {
    const activeJobs = jobs.filter(
      (job) => job.state === "waiting" || job.state === "active"
    );

    if (activeJobs.length === 0) return;

    // Optimization: prevent polling when tab is backgrounded
    const POLLING_INTERVAL_MS = 10000;

    const interval = setInterval(async () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      for (const job of activeJobs) {
        try {
          const response = await dosageAgentApiService.getJobStatus(job.id);
          const statusData = response.data;

          // Update job in IndexedDB
          await dosageJobsIndexDBManager.updateJob(job.id, {
            state: statusData.state,
            progress: statusData.progress,
            result: statusData.result,
            updatedAt: new Date(),
          });

          // Reload jobs from IndexedDB
          const updatedJobs = await dosageJobsIndexDBManager.getAllJobs();
          setJobs(updatedJobs);

          // Notify on completion
          if (statusData.state === "completed") {
            toast.success("Calcolo dosaggi completato", {
              description: `Job ${job.id} completato con successo`,
            });
          } else if (statusData.state === "failed") {
            toast.error("Calcolo dosaggi fallito", {
              description: `Job ${job.id} ha riscontrato un errore`,
            });
          }
        } catch (error) {
          console.error(`Error polling job ${job.id}:`, error);
        }
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [jobs]);

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

  // Filter production units by selected company and search query
  const filteredUnits = useMemo(() => {
    if (!selectedCompanyId) return [];
    let units = productionUnits.filter(
      (unit) => unit.companyId === selectedCompanyId
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      units = units.filter(
        (unit) =>
          unit.productionUnit.name.toLowerCase().includes(query) ||
          unit.productionUnit.cropName.toLowerCase().includes(query) ||
          unit.productionUnit.variety.toLowerCase().includes(query)
      );
    }

    return units;
  }, [productionUnits, selectedCompanyId, searchQuery]);

  // Get selected units data
  const selectedUnits = useMemo(() => {
    return filteredUnits.filter((unit) =>
      selectedUnitIds.includes(unit.productionUnit.id)
    );
  }, [filteredUnits, selectedUnitIds]);

  const productionUnitTableColumns = useMemo(() => {
    return ProductionUnitTableColumnsFactory.create();
  }, []);

  const productionUnitTableRows = useMemo(() => {
    const builder = new ProductionUnitTableRowBuilder(filteredUnits);
    return builder.build();
  }, [filteredUnits]);

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
    []
  );

  const handleActiveJobsSelectionChange = useCallback(
    (rows: Array<Record<string, unknown>>) => {
      const ids = rows.map((row) => ActiveJobsTableRowBuilder.extractId(row));
      setSelectedActiveJobIds(ids);
    },
    []
  );

  const handleImportFromWarehouse = useCallback(async () => {
    if (isWarehouseProductsLoading) {
      return;
    }

    if (!selectedCompanyId) {
      toast.error("Nessuna azienda selezionata", {
        description:
          "Seleziona un'azienda prima di importare i prodotti dal magazzino.",
      });
      return;
    }

    if (!warehouseInventory || warehouseInventory.length === 0) {
      toast.info("Nessun prodotto disponibile in magazzino", {
        description: "Aggiungi prodotti in magazzino prima di importarli.",
      });
      return;
    }

    // Filter products by selected company
    const companyProducts = warehouseInventory.filter(
      (product) => product.warehouse.company.id === selectedCompanyId
    );

    if (companyProducts.length === 0) {
      toast.info("Nessun prodotto disponibile per questa azienda", {
        description:
          "Non ci sono prodotti in magazzino per l'azienda selezionata.",
      });
      return;
    }

    let mappedProducts: DosageProduct[] = [];
    try {
      mappedProducts = await WarehouseProductsMapper.toDosageProducts(
        companyProducts
      );
    } catch (error) {
      console.error("Failed to import warehouse products:", error);
      toast.error("Importazione dal magazzino non riuscita", {
        description:
          error instanceof Error ? error.message : "Riprova più tardi.",
      });
      return;
    }

    if (mappedProducts.length === 0) {
      toast.info("Nessun prodotto importabile", {
        description: "I prodotti disponibili non hanno quantità valide.",
      });
      return;
    }

    let importedCount = 0;
    setProducts((prev) => {
      const existingKeys = new Set(
        prev.map((product) => DosageProductKeyBuilder.build(product))
      );
      const uniqueProducts = mappedProducts.filter((product) => {
        const key = DosageProductKeyBuilder.build(product);
        return !existingKeys.has(key);
      });

      importedCount = uniqueProducts.length;
      if (uniqueProducts.length === 0) {
        return prev;
      }
      return [...prev, ...uniqueProducts];
    });

    if (importedCount === 0) {
      toast.info("Tutti i prodotti di magazzino sono già presenti", {
        description:
          "Rimuovi quelli non necessari oppure aggiorna il magazzino.",
      });
      return;
    }

    toast.success("Prodotti importati dal magazzino", {
      description: `${importedCount} prodotti aggiunti alla tabella`,
    });
  }, [isWarehouseProductsLoading, warehouseInventory, selectedCompanyId]);

  const selectedCompanyName = useMemo(() => {
    if (!selectedCompanyId) {
      return null;
    }
    const company = companies.find((item) => item.id === selectedCompanyId);
    return company?.name ?? null;
  }, [companies, selectedCompanyId]);

  const selectedUnitsCount = selectedUnitIds.length;
  const selectedProductsCount = products.length;
  const isCalculateDisabled =
    isSubmitting || selectedProductsCount === 0 || selectedUnitsCount === 0;

  const selectionSummary = useMemo(() => {
    const unitLabel =
      selectedUnitsCount === 1
        ? "1 unità produttiva"
        : `${selectedUnitsCount} unità produttive`;
    const productLabel =
      selectedProductsCount === 1
        ? "1 prodotto"
        : `${selectedProductsCount} prodotti`;
    if (selectedCompanyName) {
      return `Selezionati per ${selectedCompanyName}: ${unitLabel} e ${productLabel}`;
    }
    return `Selezionati: ${unitLabel} e ${productLabel}`;
  }, [selectedCompanyName, selectedProductsCount, selectedUnitsCount]);

  const handleShowJobDetails = useCallback(
    async (job: DosageJob) => {
      if (isJobDetailsLoading && selectedJob?.id === job.id) {
        return;
      }

      setSelectedJob(job);
      setIsJobDetailsLoading(true);

      try {
        const detailedJob = await dosageJobDetailsManager.load(job);
        setSelectedJob(detailedJob);
        setJobs((prev) =>
          prev.map((existingJob) =>
            existingJob.id === detailedJob.id ? detailedJob : existingJob
          )
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
    [isJobDetailsLoading, selectedJob]
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
  }, [handleShowJobDetails]);

  const handleCancelJobs = useCallback(
    async (jobIds: string[]) => {
      const uniqueIds = [...new Set(jobIds.filter((jobId) => Boolean(jobId)))];
      if (uniqueIds.length === 0) {
        return;
      }

      setIsCancellingJobs(true);

      try {
        const updatedJobs = await dosageJobCancellationService.cancel(
          uniqueIds
        );
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
    [selectedJob]
  );

  const handleCancelSelectedActiveJobs = useCallback(() => {
    if (selectedActiveJobIds.length === 0 || isCancellingJobs) {
      return;
    }
    void handleCancelJobs(selectedActiveJobIds);
  }, [handleCancelJobs, isCancellingJobs, selectedActiveJobIds]);

  const handleCalculateDosages = async () => {
    if (products.length === 0) {
      toast.error("Nessun prodotto caricato", {
        description: "Importa almeno un prodotto prima di calcolare i dosaggi",
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

    setIsSubmitting(true);

    try {
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
        })
      );

      // Start job
      const response = await dosageAgentApiService.startJob({
        products,
        unitOfProduction: unitsOfProduction,
        strategy,
      });

      const jobId = response.data.jobId;

      // Save job to IndexedDB
      const newJob: DosageJob = {
        id: jobId,
        createdAt: new Date(),
        updatedAt: new Date(),
        state: "waiting",
        progress: 0,
        productsCount: products.length,
        unitsCount: unitsOfProduction.length,
      };

      await dosageJobsIndexDBManager.saveJob(newJob);

      // Reload jobs
      const updatedJobs = await dosageJobsIndexDBManager.getAllJobs();
      setJobs(updatedJobs);

      toast.success("Calcolo dosaggi avviato", {
        description: `Job ID: ${jobId}`,
      });

      // Reset form fields
      setSelectedCompanyId("");
      setProducts([]);
      setStrategy("avg");
      setSelectedUnitIds([]);
      setSearchQuery("");
    } catch (error) {
      toast.error("Errore durante l'avvio del calcolo", {
        description:
          error instanceof Error ? error.message : "Riprova più tardi",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalUnits = productionUnits.filter(
    (unit) => !selectedCompanyId || unit.companyId === selectedCompanyId
  ).length;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Gestione Dosaggi"
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

      <div className="flex-1 overflow-auto px-4 md:px-6 pb-6">
        {currentPage === "manage" ? (
          <div className="mx-auto space-y-8 md:space-y-12">
            {/* Company Filter Section */}
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg md:text-xl font-medium text-neutral-900">
                  Seleziona Azienda
                </h2>
              </div>
              <Select
                value={selectedCompanyId}
                onValueChange={(value) => {
                  setSelectedCompanyId(value);
                  setSelectedUnitIds([]);
                  setSearchQuery("");
                }}
              >
                <SelectTrigger className="w-full max-w-md h-12 bg-neutral-50 border-neutral-200">
                  <SelectValue placeholder="Scegli un'azienda" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Units Section */}
            {selectedCompanyId && (
              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg md:text-xl font-medium text-neutral-900">
                      Seleziona Unità Produttive
                    </h2>
                    {selectedUnitIds.length > 0 && (
                      <p className="text-sm text-neutral-500 mt-1">
                        {selectedUnitIds.length} selezionate
                      </p>
                    )}
                  </div>
                  <div className="w-full lg:w-auto">
                    <Input
                      value={searchQuery}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setSearchQuery(event.target.value)
                      }
                      placeholder="Cerca per nome, coltura o varietà"
                      aria-label="Cerca unità produttive"
                      disabled={loadingUnits}
                      className="bg-white"
                    />
                  </div>
                </div>

                {loadingUnits ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                  </div>
                ) : filteredUnits.length === 0 ? (
                  <div className="text-center py-16 text-neutral-500">
                    {searchQuery
                      ? "Nessuna unità trovata"
                      : "Nessuna unità disponibile per questa azienda"}
                  </div>
                ) : (
                  <EditableTable
                    columns={productionUnitTableColumns}
                    rows={productionUnitTableRows}
                    isModify={false}
                    addButton={false}
                    onSelectionChange={handleUnitSelectionChange}
                    showDeleteAction={false}
                    getRowId={(row) => (row as ProductionUnitTableRow).id}
                    className="bg-white rounded-2xl border border-neutral-200"
                  />
                )}
              </div>
            )}

            {/* Products Section */}
            <div className="space-y-4 md:space-y-6 relative">
              {!selectedCompanyId && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
                  <div className="text-center p-6">
                    <p className="text-base font-medium text-neutral-700 mb-2">
                      Seleziona prima un'azienda
                    </p>
                    <p className="text-sm text-neutral-500">
                      Per selezionare i prodotti fitosanitari, devi prima
                      scegliere un'azienda nella sezione sopra.
                    </p>
                  </div>
                </div>
              )}
              <div
                className={
                  selectedCompanyId ? "" : "pointer-events-none opacity-50"
                }
              >
                <div>
                  <h2 className="text-lg md:text-xl font-medium text-neutral-900">
                    Seleziona prodotti fitosanitari
                  </h2>
                  {products.length > 0 && (
                    <p className="text-sm text-neutral-500 mt-1">
                      {products.length} prodotti caricati
                    </p>
                  )}
                </div>
                <EditableTable
                  ref={editableTableRef}
                  columns={productColumns}
                  rows={productsAsRows}
                  isModify={true}
                  addButton={true}
                  onSave={handleSaveProducts}
                  onDeleteSelected={handleDeleteProducts}
                  getRowId={(row, index) =>
                    `${row.productName}-${row.registrationNumber}-${index}`
                  }
                  lastComponent={renderProductLabelAction}
                >
                  <div
                    data-editable-table-slot="create-drawer"
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-6"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-neutral-900">
                        Importa prodotti
                      </p>
                      <p className="text-sm text-neutral-500">
                        Carica rapidamente i prodotti tramite CSV oppure leggi i
                        DDT in formato PDF.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ImportProducts
                        onAddRows={handleAddRows}
                        onProductsChange={setProducts}
                      />
                      <ImportProductsFromDdt
                        onAddRows={handleAddRows}
                        onProductsChange={setProducts}
                      />
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleImportFromWarehouse}
                        disabled={
                          isWarehouseProductsLoading || !selectedCompanyId
                        }
                      >
                        {isWarehouseProductsLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Importazione...</span>
                          </>
                        ) : (
                          <>
                            <Package className="h-4 w-4" />
                            <span>Importa da magazzino</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <FitosanitariProductSearch
                      onProductSelected={handleRegistryProductSelected}
                    />
                  </div>
                </EditableTable>
                {products.length === 0 &&
                  dosagePlaceholderRenderer.renderEmptyProductsPlaceholder()}
              </div>
            </div>

            {/* Strategy Section */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between relative">
              {!selectedCompanyId && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
                  <div className="text-center p-6">
                    <p className="text-base font-medium text-neutral-700 mb-2">
                      Seleziona prima un'azienda
                    </p>
                    <p className="text-sm text-neutral-500">
                      Per selezionare la strategia di calcolo, devi prima
                      scegliere un'azienda nella sezione sopra.
                    </p>
                  </div>
                </div>
              )}
              <div
                className={
                  selectedCompanyId
                    ? "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between w-full"
                    : "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between w-full pointer-events-none opacity-50"
                }
              >
                <div>
                  <h2 className="text-lg md:text-xl font-medium text-neutral-900">
                    Seleziona la strategia di calcolo dosaggi
                  </h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    {selectedStrategyOption.description}
                  </p>
                </div>
                <Select
                  value={strategy}
                  onValueChange={(value) =>
                    setStrategy(value as DosageStrategy)
                  }
                  disabled={!selectedCompanyId}
                >
                  <SelectTrigger className="w-full max-w-sm h-12 bg-white border-neutral-200">
                    <SelectValue placeholder="Seleziona una strategia" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto space-y-6">
            <div className="space-y-4 md:space-y-6">
              {activeJobs.length > 0 && (
                <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-900">
                        Job attivi ({activeJobs.length})
                      </h3>
                      <p className="text-sm text-neutral-500">
                        {activeSelectionLabel}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2 self-start lg:self-auto"
                      disabled={
                        selectedActiveJobIds.length === 0 || isCancellingJobs
                      }
                      onClick={handleCancelSelectedActiveJobs}
                    >
                      {isCancellingJobs ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Annullamento...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          <span>Annulla selezionati</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <EditableTable
                    columns={activeJobColumns}
                    rows={activeJobRows}
                    isModify={false}
                    addButton={false}
                    showDeleteAction={false}
                    onSelectionChange={handleActiveJobsSelectionChange}
                    getRowId={(row) => ActiveJobsTableRowBuilder.extractId(row)}
                    className="bg-white"
                  />
                  <div className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-neutral-600 leading-tight">
                      Ci vorranno da 1 a massimo 10 minuti per elaborare i
                      dosaggi. Puoi annullare i job selezionandoli nella
                      tabella.
                    </p>
                  </div>
                </section>
              )}

              <section className="space-y-4">
                {jobs.length === 0 ? (
                  <div className="text-center py-16 text-neutral-500 bg-white rounded-2xl border border-neutral-200">
                    <Clock className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                    <p>Nessun calcolo effettuato</p>
                  </div>
                ) : (
                  <EditableTable
                    columns={historyJobColumns}
                    rows={historyJobRows}
                    isModify={false}
                    addButton={false}
                    showDeleteAction={false}
                    getRowId={(row) => (row as JobHistoryTableRow).id}
                    onOpenDetails={(row) => {
                      const typedRow = row as JobHistoryTableRow;
                      void handleShowJobDetails(typedRow.job);
                    }}
                    className="bg-white rounded-2xl border border-neutral-200"
                  />
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t bg-white px-4 md:px-6 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-neutral-500">
              {selectedCompanyName
                ? `Azienda selezionata: ${selectedCompanyName}`
                : "Nessuna azienda selezionata"}
            </p>
            <p className="text-sm text-neutral-500">
              Strategia selezionata: {selectedStrategyOption.label}
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

      <Drawer open={isLabelDrawerOpen} onOpenChange={handleLabelDrawerChange}>
        <DrawerContent data-vaul-drawer-direction="right">
          <DrawerHeader>
            <DrawerTitle>Dettaglio etichetta</DrawerTitle>
            <DrawerDescription>
              {labelReference
                ? labelReference.displayLabel
                : "Seleziona un prodotto per visualizzare l'etichetta."}
            </DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 pb-6 space-y-6">
            {isLabelLoading && (
              <div className="flex h-48 flex-col items-center justify-center gap-3 text-neutral-500">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm font-medium">Caricamento etichetta...</p>
              </div>
            )}
            {!isLabelLoading && labelError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {labelError}
              </div>
            )}
            {!isLabelLoading && !labelError && labelDetails && (
              <>
                <section className="space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900">
                        Panoramica etichetta
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Dati principali estratti automaticamente
                      </p>
                    </div>
                    <Badge
                      variant={labelDetails.isVerified ? "default" : "outline"}
                      className="text-xs"
                    >
                      {labelDetails.isVerified ? "Verificata" : "Da verificare"}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {labelSummaryPairs.map((pair) => (
                      <div
                        key={`label-summary-${pair.label}`}
                        className="rounded-xl border border-neutral-200 bg-white p-3"
                      >
                        <p className="text-xs text-neutral-500">{pair.label}</p>
                        <p className="text-sm font-semibold text-neutral-900 break-words">
                          {pair.value}
                        </p>
                      </div>
                    ))}
                    <div className="rounded-xl border border-neutral-200 bg-white p-3">
                      <p className="text-xs text-neutral-500">Fonte</p>
                      {labelDetails.sourceUrl ? (
                        <a
                          href={labelDetails.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {labelDetails.sourceUrl}
                        </a>
                      ) : (
                        <span className="text-sm text-neutral-500">N/D</span>
                      )}
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-white p-3">
                      <p className="text-xs text-neutral-500">
                        Ultimo aggiornamento
                      </p>
                      <p className="text-sm font-semibold text-neutral-900">
                        {new Date(labelDetails.updatedAt).toLocaleString(
                          "it-IT"
                        )}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Creato il{" "}
                        {new Date(labelDetails.createdAt).toLocaleString(
                          "it-IT"
                        )}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Affidabilità estrazione
                    </h3>
                    <span className="text-xs font-medium text-neutral-700">
                      {labelConfidenceValue}%
                    </span>
                  </div>
                  <Progress value={labelConfidenceValue} />
                </section>

                {(labelSpecies.length > 0 ||
                  labelDiseases.length > 0 ||
                  labelCrops.length > 0) && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Ambito di impiego
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {labelSpecies.length > 0 && (
                        <div>
                          <p className="text-xs text-neutral-500 mb-2">
                            Specie coperte
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {labelSpecies.map((item, index) => (
                              <Badge
                                key={`species-${index}`}
                                variant="secondary"
                                className="text-xs"
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {labelDiseases.length > 0 && (
                        <div>
                          <p className="text-xs text-neutral-500 mb-2">
                            Organismi bersaglio
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {labelDiseases.map((item, index) => (
                              <Badge
                                key={`diseases-${index}`}
                                variant="secondary"
                                className="text-xs"
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {labelCrops.length > 0 && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-2">
                          Colture target
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {labelCrops.map((item, index) => (
                            <Badge
                              key={`crops-${index}`}
                              variant="outline"
                              className="text-xs"
                            >
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {labelDescriptiveFields.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Note agronomiche
                    </h3>
                    <div className="space-y-3">
                      {labelDescriptiveFields.map((field) => (
                        <div
                          key={field.title}
                          className="rounded-xl border border-neutral-200 bg-white p-4"
                        >
                          <p className="text-xs text-neutral-500">
                            {field.title}
                          </p>
                          <p className="text-sm text-neutral-900 whitespace-pre-line">
                            {field.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {(labelHazardStatements.length > 0 ||
                  labelPrecautionStatements.length > 0 ||
                  labelWarnings.length > 0) && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Sicurezza e avvertenze
                    </h3>
                    {labelHazardStatements.length > 0 && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">
                          Frasi di pericolo
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-sm text-neutral-900">
                          {labelHazardStatements.map((item, index) => (
                            <li key={`hazard-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {labelPrecautionStatements.length > 0 && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">
                          Frasi di prudenza
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-sm text-neutral-900">
                          {labelPrecautionStatements.map((item, index) => (
                            <li key={`precaution-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {labelWarnings.length > 0 && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">
                          Avvertenze aggiuntive
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-sm text-neutral-900">
                          {labelWarnings.map((item, index) => (
                            <li key={`warning-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}

                {labelRespectRules.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Fasce di rispetto e deriva
                    </h3>
                    <ul className="list-inside list-disc space-y-1 text-sm text-neutral-900">
                      {labelRespectRules.map((rule, index) => (
                        <li key={`respect-rule-${index}`}>{rule}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {labelDosageDetails.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-neutral-900">
                        Dosaggi dettagliati
                      </h3>
                      {hasLabelDosageOverflow && (
                        <span className="text-xs text-neutral-500">
                          Mostrate {visibleLabelDosages.length} di{" "}
                          {labelDosageDetails.length} voci
                        </span>
                      )}
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-neutral-50">
                            <TableHead className="text-xs font-semibold">
                              Coltura
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Bersaglio / istruzioni
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Dose
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Applicazioni
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Carenza
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleLabelDosages.map((detail, index) => (
                            <TableRow key={`dosage-detail-${index}`}>
                              <TableCell>
                                <p className="text-sm font-medium text-neutral-900">
                                  {detail.coltura || "-"}
                                </p>
                                {detail.modalita_applicazione && (
                                  <p className="text-xs text-neutral-500">
                                    {detail.modalita_applicazione}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell>
                                <p className="text-sm font-medium text-neutral-900">
                                  {detail.malattia || "-"}
                                </p>
                                {detail.istruzioni && (
                                  <p className="text-xs text-neutral-500">
                                    {detail.istruzioni}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm text-neutral-900">
                                {ProductLabelDosageFormatter.formatDose(detail)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm text-neutral-900">
                                {ProductLabelDosageFormatter.formatApplications(
                                  detail
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm text-neutral-900">
                                {ProductLabelDosageFormatter.formatSafetyInterval(
                                  detail
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </section>
                )}

                {labelExtractedFields.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Campi riconosciuti
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {labelExtractedFields.map((field, index) => (
                        <Badge
                          key={`label-extracted-${index}`}
                          variant="outline"
                          className="text-xs"
                        >
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </section>
                )}

                {labelQualityExtraction.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Indicatori di qualità
                    </h3>
                    <ScrollArea className="max-h-48 rounded-xl border border-neutral-200 bg-white">
                      <div className="divide-y">
                        {labelQualityExtraction.map((item, index) => (
                          <div
                            key={`label-quality-${index}`}
                            className="space-y-1 p-3"
                          >
                            <p className="text-xs text-neutral-500">
                              Voce {index + 1}
                            </p>
                            <pre className="whitespace-pre-wrap text-xs text-neutral-800">
                              {JSON.stringify(item, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </section>
                )}

                {labelErrors.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Errori di estrazione
                    </h3>
                    <ul className="list-inside list-disc space-y-1 text-sm text-red-600">
                      {labelErrors.map((message, index) => (
                        <li key={`label-error-${index}`}>{message}</li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Estratto testuale
                  </h3>
                  {labelDetails.rawText ? (
                    <ScrollArea className="h-48 rounded-xl border border-neutral-200 bg-neutral-50">
                      <pre className="whitespace-pre-wrap p-4 text-xs text-neutral-800">
                        {labelDetails.rawText}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-neutral-500">
                      Nessun testo disponibile.
                    </p>
                  )}
                </section>

                {hasStructuredLabelPayload && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Payload etichetta (JSON)
                    </h3>
                    <ScrollArea className="h-56 rounded-xl border border-neutral-200 bg-neutral-50">
                      <pre className="whitespace-pre-wrap p-4 text-xs font-mono text-neutral-800">
                        {JSON.stringify(structuredLabelAdapter.data, null, 2)}
                      </pre>
                    </ScrollArea>
                  </section>
                )}
              </>
            )}
            {!isLabelLoading && !labelError && !labelDetails && (
              <p className="text-sm text-neutral-500">
                Nessuna etichetta disponibile per questo prodotto.
              </p>
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Chiudi
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <JobDetails
        selectedJob={selectedJob}
        onSelectedJobChange={setSelectedJob}
        jobDetailsLoading={isJobDetailsLoading}
      />
    </div>
  );
}
