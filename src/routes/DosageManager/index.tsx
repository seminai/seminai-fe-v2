import { useState, useEffect, useMemo, useRef } from "react";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import { useCompanies } from "@/hooks/useCompanies";
import { ImportProducts } from "./importProducts";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Calculator,
  CheckCircle2,
  Clock,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import {
  dosageAgentApiService,
  type DosageProduct,
  type DosageUnitOfProduction,
} from "@/api/dosage-agent";
import {
  dosageJobsIndexDBManager,
  type DosageJob,
} from "@/utils/dosageJobsIndexDBManager";
import { JobDetails } from "./JobDetails";

export default function DosageManager() {
  const { productionUnits, isLoading: loadingUnits } = useProductionUnit();
  const { companies } = useCompanies();

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
  const convertTableRowsToProducts = (
    rows: Array<Record<string, unknown>>
  ): DosageProduct[] => {
    return rows.map((row) => ({
      productName: String(row.productName || ""),
      registrationNumber: String(row.registrationNumber || ""),
      quantity: Number(row.quantity) || 0,
      quantityUnitOfMeasure: String(row.quantityUnitOfMeasure || ""),
      supplierName: row.supplierName ? String(row.supplierName) : undefined,
      supplierVat: row.supplierVat ? String(row.supplierVat) : undefined,
    }));
  };

  // Gestisce l'aggiunta di righe dalla tabella editabile
  const handleAddRows = (rows: Array<Record<string, unknown>>): void => {
    if (editableTableRef.current) {
      editableTableRef.current.addRows(rows);
      // Aggiorna anche lo stato dei prodotti per mantenere la sincronizzazione
      // I prodotti importati vengono aggiunti come "nuovi" e verranno salvati quando l'utente clicca "Salva"
      const newProducts = convertTableRowsToProducts(rows);
      setProducts((prev) => {
        // Evita duplicati controllando se il prodotto esiste già
        const existingIds = new Set(
          prev.map((p) => `${p.productName}-${p.registrationNumber}`)
        );
        const uniqueNewProducts = newProducts.filter(
          (p) => !existingIds.has(`${p.productName}-${p.registrationNumber}`)
        );
        return [...prev, ...uniqueNewProducts];
      });
    }
  };

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
    }));
  }, [products]);

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

  const handleToggleUnit = (unitId: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId)
        ? prev.filter((id) => id !== unitId)
        : [...prev, unitId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUnitIds.length === filteredUnits.length) {
      setSelectedUnitIds([]);
    } else {
      setSelectedUnitIds(filteredUnits.map((u) => u.productionUnit.id));
    }
  };

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
        centerElement={
          <div className="inline-flex p-1 bg-gray-100 rounded-lg gap-1">
            <button
              onClick={() => setCurrentPage("manage")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                currentPage === "manage"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Gestione
            </button>
            <button
              onClick={() => setCurrentPage("history")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                currentPage === "history"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Storico
            </button>
          </div>
        }
        rightElement={
          <div className="flex items-center gap-3">
            {activeJobs.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowJobsPanel(true)}
                className="gap-2"
              >
                <Activity className="h-4 w-4 animate-pulse" />
                {activeJobs.length} Job attivi
              </Button>
            )}
            <Button
              size="lg"
              onClick={handleCalculateDosages}
              disabled={
                isSubmitting ||
                products.length === 0 ||
                selectedUnitIds.length === 0
              }
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calcolo...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" />
                  Calcola Dosaggi
                </>
              )}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-6 pb-6">
        {currentPage === "manage" ? (
          <div className="mx-auto space-y-12">
            {/* Company Filter Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-neutral-900">
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
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-medium text-neutral-900">
                      Unità Produttive
                    </h2>
                    {selectedUnitIds.length > 0 && (
                      <p className="text-sm text-neutral-500 mt-1">
                        {selectedUnitIds.length} selezionate
                      </p>
                    )}
                  </div>
                  {filteredUnits.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-neutral-600"
                    >
                      {selectedUnitIds.length === filteredUnits.length
                        ? "Deseleziona tutto"
                        : "Seleziona tutto"}
                    </Button>
                  )}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUnits.map((unit) => (
                      <button
                        key={unit.productionUnit.id}
                        onClick={() => handleToggleUnit(unit.productionUnit.id)}
                        className={`
                            group relative p-6 text-left rounded-xl border transition-all
                            ${
                              selectedUnitIds.includes(unit.productionUnit.id)
                                ? "border-neutral-900 bg-neutral-50 shadow-sm"
                                : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm"
                            }
                          `}
                      >
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedUnitIds.includes(
                              unit.productionUnit.id
                            )}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-neutral-900 truncate">
                              {unit.productionUnit.name}
                            </h3>
                            <p className="text-sm text-neutral-600 mt-1">
                              {unit.productionUnit.cropName}
                            </p>
                            <div className="flex items-center gap-3 mt-3">
                              <Badge variant="outline" className="text-xs">
                                {unit.productionUnit.variety}
                              </Badge>
                              <span className="text-xs text-neutral-500">
                                {unit.productionUnit.areaHa} ha
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Products Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-medium text-neutral-900">
                    Prodotti Fitosanitari
                  </h2>
                  {products.length > 0 && (
                    <p className="text-sm text-neutral-500 mt-1">
                      {products.length} prodotti caricati
                    </p>
                  )}
                </div>
                <ImportProducts
                  onAddRows={handleAddRows}
                  onProductsChange={setProducts}
                />
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
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto space-y-6">
            {/* History View */}
            <div className="space-y-6">
              <h2 className="text-xl font-medium text-neutral-900">
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
                            onClick={() => setSelectedJob(job)}
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
                                  setSelectedJob(job);
                                }}
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

      <JobDetails
        showPanel={showJobsPanel}
        onPanelChange={setShowJobsPanel}
        activeJobs={activeJobs}
        selectedJob={selectedJob}
        onSelectedJobChange={setSelectedJob}
      />
    </div>
  );
}
