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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Activity,
  Apple,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  dosageAgentApiService,
  type DosageProduct,
  type DosageUnitOfProduction,
} from "@/api/dosage-agent";
import type { ProductionUnit } from "@/api/production-unit";
import type { Product } from "@/api/products";
import {
  dosageJobsIndexDBManager,
  type DosageJob,
} from "@/utils/dosageJobsIndexDBManager";
import { JobDetails } from "./JobDetails";
import type { FitosanitariDatasetRecord } from "@/services/fitosanitariRegistry";
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

class WarehouseProductsMapper {
  public static toDosageProducts(products: Product[]): DosageProduct[] {
    return products
      .map((product) => {
        const calculator = new WarehouseProductStockCalculator(product.stocks);
        const netQuantity = calculator.calculateNetQuantity();
        return {
          productName: product.name,
          registrationNumber: product.sku || product.id,
          quantity: netQuantity > 0 ? netQuantity : 0,
          quantityUnitOfMeasure: calculator.getUnitOfMeasure(),
          loadWarehouse: false,
          supplierName: product.warehouse.company.name,
        };
      })
      .filter((product) => product.quantity > 0);
  }
}

class DosageProductKeyBuilder {
  public static build(product: DosageProduct): string {
    return `${product.productName}-${product.registrationNumber}`;
  }
}

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

  const editableTableRef = useRef<EditableTable>(null);

  const [jobs, setJobs] = useState<DosageJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<DosageJob | null>(null);
  const [showJobsPanel, setShowJobsPanel] = useState(false);
  const [isJobDetailsLoading, setIsJobDetailsLoading] = useState(false);
  const isHistoryPage = currentPage === "history";

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

    const interval = setInterval(async () => {
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
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [jobs]);

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

  const handleImportFromWarehouse = useCallback(() => {
    if (isWarehouseProductsLoading) {
      return;
    }

    if (!warehouseInventory || warehouseInventory.length === 0) {
      toast.info("Nessun prodotto disponibile in magazzino", {
        description: "Aggiungi prodotti in magazzino prima di importarli.",
      });
      return;
    }

    const mappedProducts =
      WarehouseProductsMapper.toDosageProducts(warehouseInventory);

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
  }, [isWarehouseProductsLoading, warehouseInventory]);

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

      // Show jobs panel
      setShowJobsPanel(true);
    } catch (error) {
      toast.error("Errore durante l'avvio del calcolo", {
        description:
          error instanceof Error ? error.message : "Riprova più tardi",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeJobs = jobs.filter(
    (job) => job.state === "waiting" || job.state === "active"
  );

  const totalUnits = productionUnits.filter(
    (unit) => !selectedCompanyId || unit.companyId === selectedCompanyId
  ).length;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Gestione Dosaggi"
        totalItems={totalUnits}
        filteredItems={filteredUnits.length}
        rightElement={
          activeJobs.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowJobsPanel(true)}
              className="gap-2 w-full md:w-auto"
            >
              <Activity className="h-4 w-4 animate-pulse" />
              <span className="md:inline">{activeJobs.length} Job attivi</span>
            </Button>
          )
        }
      >
        <Button
          variant="ghost"
          onClick={historyButtonAction}
          className="gap-2 text-neutral-500 hover:text-neutral-700"
        >
          <Clock className="h-4 w-4" />
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
            <div className="space-y-4 md:space-y-6">
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
                getRowId={(row) =>
                  `${row.productName}-${row.registrationNumber}`
                }
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
                      disabled={isWarehouseProductsLoading}
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
        ) : (
          <div className="mx-auto space-y-4 md:space-y-6">
            {/* History View */}
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-lg md:text-xl font-medium text-neutral-900">
                Storico Calcoli Dosaggi
              </h2>

              {jobs.length === 0 ? (
                <div className="text-center py-16 text-neutral-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                  <p>Nessun calcolo effettuato</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-50">
                        <TableHead className="font-semibold">Job ID</TableHead>
                        <TableHead className="font-semibold">
                          Data Creazione
                        </TableHead>
                        <TableHead className="font-semibold">Stato</TableHead>
                        <TableHead className="font-semibold">
                          Progresso
                        </TableHead>
                        <TableHead className="font-semibold">
                          Prodotti
                        </TableHead>
                        <TableHead className="font-semibold">Unità</TableHead>
                        <TableHead className="font-semibold">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                        )
                        .map((job) => (
                          <TableRow
                            key={job.id}
                            className="hover:bg-neutral-50 cursor-pointer"
                            onClick={() => {
                              void handleShowJobDetails(job);
                            }}
                          >
                            <TableCell className="font-medium">
                              {job.id}
                            </TableCell>
                            <TableCell className="text-neutral-600">
                              {new Date(job.createdAt).toLocaleDateString(
                                "it-IT",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {job.state === "completed" && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                                {(job.state === "waiting" ||
                                  job.state === "active") && (
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                )}
                                {job.state === "failed" && (
                                  <Activity className="h-4 w-4 text-red-600" />
                                )}
                                <Badge
                                  variant={
                                    job.state === "completed"
                                      ? "default"
                                      : job.state === "failed"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {job.state === "completed"
                                    ? "Completato"
                                    : job.state === "failed"
                                    ? "Fallito"
                                    : job.state === "waiting"
                                    ? "In Attesa"
                                    : "Attivo"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-neutral-200 rounded-full h-2">
                                  <div
                                    className="bg-neutral-900 h-2 rounded-full transition-all"
                                    style={{ width: `${job.progress}%` }}
                                  />
                                </div>
                                <span className="text-sm text-neutral-600">
                                  {job.progress}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-neutral-600">
                              {job.productsCount}
                            </TableCell>
                            <TableCell className="text-neutral-600">
                              {job.unitsCount}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleShowJobDetails(job);
                                }}
                                disabled={
                                  isJobDetailsLoading &&
                                  selectedJob?.id === job.id
                                }
                                className="text-neutral-600 hover:text-neutral-900"
                              >
                                Dettagli
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
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
        showPanel={showJobsPanel}
        onPanelChange={setShowJobsPanel}
        activeJobs={activeJobs}
        selectedJob={selectedJob}
        onSelectedJobChange={setSelectedJob}
        jobDetailsLoading={isJobDetailsLoading}
      />
    </div>
  );
}
