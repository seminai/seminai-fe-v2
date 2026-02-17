import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/organism/Header";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import {
  getAuthorizedFitosanitariRecords,
  type FitosanitariDatasetRecord,
} from "@/services/fitosanitariRegistry";
import { MultiSearchableSelect } from "@/routes/DosageManager/MultiSearchableSelect";
import { jobsApiService } from "@/api/jobs";
import type { CreateJobPayload } from "@/api/jobs";
import { generateRandomJobId } from "./utils";

interface ProductionUnitOption {
  id: string;
  name: string;
  cropName: string;
  cropType: string;
  companyId: string;
  companyName: string;
  value: string;
  label: string;
  sauHa?: number;
}

interface CompanyOption {
  value: string;
  label: string;
  companyId: string;
  companyName: string;
}

interface ProductFormRow {
  registrationNumber: string;
  productName: string;
  qtyPerHa: string;
  totalQty: string;
  unitOfMeasure: string;
}

const UNIT_MEASURE_OPTIONS = ["L", "KG", "ML", "G"];

export default function NewJobManual() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const jobIdFromState = (location.state as { jobId?: string } | null)?.jobId;
  const currentJobId = useMemo(
    () => jobIdFromState ?? generateRandomJobId(),
    [jobIdFromState],
  );

  const { productionUnits } = useProductionUnit();
  const [fitosanitariProducts, setFitosanitariProducts] = useState<
    FitosanitariDatasetRecord[]
  >([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [dateOfOperation, setDateOfOperation] = useState<Date>(() => new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [percentToTreat, setPercentToTreat] = useState<string>("100");
  const [sauTrattataOverride, setSauTrattataOverride] = useState<string>("");
  const [productRows, setProductRows] = useState<Record<string, ProductFormRow>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getAuthorizedFitosanitariRecords()
      .then(setFitosanitariProducts)
      .catch((err) => console.error("Error loading fitosanitari:", err))
      .finally(() => setIsLoadingProducts(false));
  }, []);

  const companySelectOptions = useMemo((): CompanyOption[] => {
    const map = new Map<string, { id: string; name: string }>();
    productionUnits.forEach((pu) => {
      if (!map.has(pu.companyId)) {
        map.set(pu.companyId, { id: pu.companyId, name: pu.companyName });
      }
    });
    return Array.from(map.values()).map((c) => ({
      value: c.id,
      label: c.name,
      companyId: c.id,
      companyName: c.name,
    }));
  }, [productionUnits]);

  const productionUnitSelectOptions = useMemo((): ProductionUnitOption[] => {
    return productionUnits.map((pu) => {
      const sauHa =
        pu.fields?.reduce((sum, f) => sum + (f.sauHa ?? 0), 0) ?? undefined;
      return {
        id: pu.productionUnit.id,
        name: pu.productionUnit.name,
        cropName: pu.productionUnit.cropName,
        cropType: pu.productionUnit.cropType ?? "",
        companyId: pu.companyId,
        companyName: pu.companyName,
        value: pu.productionUnit.id,
        label: `${pu.productionUnit.name} (${pu.productionUnit.cropName})`,
        sauHa,
      };
    });
  }, [productionUnits]);

  const filteredUnits = useMemo(() => {
    if (!selectedCompanyId) return [];
    return productionUnitSelectOptions.filter(
      (pu) => pu.companyId === selectedCompanyId,
    );
  }, [selectedCompanyId, productionUnitSelectOptions]);

  const unitOptions = useMemo(
    () =>
      filteredUnits.map((pu) => ({
        value: pu.id,
        label: pu.name,
        description: `${pu.cropName} - ${pu.cropType}`,
      })),
    [filteredUnits],
  );

  const productsForSelect = useMemo(
    () =>
      fitosanitariProducts.map((p) => ({
        value: p.registrationNumber,
        label: p.productName,
        description: p.activeIngredients,
      })),
    [fitosanitariProducts],
  );

  const selectedUnits = useMemo(
    () =>
      productionUnitSelectOptions.filter((pu) => selectedUnitIds.includes(pu.id)),
    [productionUnitSelectOptions, selectedUnitIds],
  );

  const sauTotSelected = useMemo(
    () =>
      selectedUnits.reduce(
        (sum, u) => sum + (u.sauHa ?? 0),
        0,
      ),
    [selectedUnits],
  );

  const percentNum = useMemo(() => {
    const n = parseFloat(percentToTreat);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 100;
  }, [percentToTreat]);

  const sauTrattataComputed = useMemo(
    () => (sauTotSelected * percentNum) / 100,
    [sauTotSelected, percentNum],
  );

  const sauTrattataEffective = useMemo(() => {
    if (sauTrattataOverride.trim() === "") return sauTrattataComputed;
    const override = parseFloat(sauTrattataOverride);
    return Number.isFinite(override) && override >= 0 ? override : sauTrattataComputed;
  }, [sauTrattataOverride, sauTrattataComputed]);

  const selectedProducts = useMemo(
    () =>
      fitosanitariProducts.filter((p) =>
        selectedProductIds.includes(p.registrationNumber),
      ),
    [fitosanitariProducts, selectedProductIds],
  );

  useEffect(() => {
    setProductRows((prev) => {
      const next = { ...prev };
      selectedProducts.forEach((p) => {
        if (!next[p.registrationNumber]) {
          next[p.registrationNumber] = {
            registrationNumber: p.registrationNumber,
            productName: p.productName,
            qtyPerHa: "",
            totalQty: "",
            unitOfMeasure: "L",
          };
        }
      });
      Object.keys(next).forEach((regNum) => {
        if (!selectedProductIds.includes(regNum)) delete next[regNum];
      });
      return next;
    });
  }, [selectedProductIds, selectedProducts]);

  const updateProductRow = (
    registrationNumber: string,
    field: keyof ProductFormRow,
    value: string,
  ) => {
    setProductRows((prev) => {
      const row = prev[registrationNumber];
      if (!row) return prev;
      const next = { ...row, [field]: value };
      if (field === "qtyPerHa" && sauTrattataEffective > 0) {
        const q = parseFloat(value);
        if (Number.isFinite(q)) next.totalQty = String(q * sauTrattataEffective);
      }
      if (field === "totalQty" && sauTrattataEffective > 0) {
        const tot = parseFloat(value);
        if (Number.isFinite(tot)) next.qtyPerHa = String(tot / sauTrattataEffective);
      }
      return { ...prev, [registrationNumber]: next };
    });
  };

  const canSave =
    selectedCompanyId &&
    selectedUnitIds.length > 0 &&
    selectedProductIds.length > 0 &&
    dateOfOperation &&
    sauTrattataEffective > 0 &&
    Object.values(productRows).every(
      (r) =>
        r.qtyPerHa.trim() !== "" &&
        parseFloat(r.qtyPerHa) > 0 &&
        r.totalQty.trim() !== "" &&
        parseFloat(r.totalQty) > 0,
    );

  const handleSubmit = async () => {
    if (!canSave || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payloads: CreateJobPayload[] = [];
      const dateIso = dateOfOperation.toISOString();

      selectedUnits.forEach((unit) => {
        const unitShare =
          sauTotSelected > 0 ? (unit.sauHa ?? 0) / sauTotSelected : 1;
        const unitTreatedSurface = sauTrattataEffective * unitShare;

        selectedProducts.forEach((product) => {
          const row = productRows[product.registrationNumber];
          if (!row) return;
          const totalQty = parseFloat(row.totalQty) || 0;
          const quantityForUnit = totalQty * unitShare;

          payloads.push({
            productionUnitId: unit.id,
            dateOfOpeation: dateIso,
            category: "TREATMENT",
            quantity: quantityForUnit,
            unitOfMeasureQuantity: row.unitOfMeasure,
            treatedSurface: unitTreatedSurface,
            jobId: currentJobId,
            stocks: [
              {
                product: {
                  name: product.productName,
                  category: "PESTICIDE",
                  type: "Fitosanitario",
                  registrationNumber: product.registrationNumber,
                },
                quantity: -quantityForUnit,
                unitOfMeasureQuantity: row.unitOfMeasure,
                type: "OUT",
              },
            ],
          });
        });
      });

      await jobsApiService.createProductAndJob(payloads);
      await queryClient.invalidateQueries({ queryKey: ["job-groups-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["job-group-detail"] });

      toast.success("Operazioni create", {
        description: `${payloads.length} operazioni create con successo`,
      });
      navigate("/job");
    } catch (err) {
      toast.error("Errore durante il salvataggio", {
        description: err instanceof Error ? err.message : "Riprova più tardi",
      });
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Nuova operazione manuale"
        className="border-b border-border/50"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/job")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Button>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* 1. Azienda */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground">
            Azienda <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedCompanyId}
            onValueChange={(v) => {
              setSelectedCompanyId(v);
              setSelectedUnitIds([]);
            }}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Seleziona azienda..." />
            </SelectTrigger>
            <SelectContent>
              {companySelectOptions.map((c) => (
                <SelectItem key={c.companyId} value={c.companyId}>
                  {c.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 2. Unità produttive */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground">
            Unità produttive <span className="text-red-500">*</span>
          </Label>
          {!selectedCompanyId ? (
            <div className="text-sm text-muted-foreground italic border border-dashed rounded-md p-3">
              Seleziona prima un'azienda
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="text-sm text-muted-foreground italic border border-dashed rounded-md p-3">
              Nessuna unità produttiva per questa azienda
            </div>
          ) : (
            <MultiSearchableSelect
              value={selectedUnitIds}
              options={unitOptions}
              placeholder="Seleziona una o più unità produttive..."
              searchPlaceholder="Cerca unità produttiva..."
              emptyMessage="Nessuna unità produttiva trovata"
              onChange={setSelectedUnitIds}
            />
          )}
        </div>

        {/* 3. Tabella SAU */}
        {selectedUnits.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Riepilogo SAU
            </Label>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left font-medium p-3">SAU tot selezionata (ha)</th>
                    <th className="text-left font-medium p-3">% da trattare</th>
                    <th className="text-left font-medium p-3">SAU trattata (ha)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 align-middle">
                      {sauTotSelected.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={percentToTreat}
                        onChange={(e) => setPercentToTreat(e.target.value)}
                        className="h-9 w-24"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={
                          sauTrattataOverride !== ""
                            ? sauTrattataOverride
                            : sauTrattataComputed.toFixed(2)
                        }
                        onChange={(e) => setSauTrattataOverride(e.target.value)}
                        placeholder={sauTrattataComputed.toFixed(2)}
                        className="h-9 w-28"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Prodotti */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground">
            Prodotti <span className="text-red-500">*</span>
          </Label>
          {isLoadingProducts ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2 border border-dashed rounded-md p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento prodotti...
            </div>
          ) : (
            <MultiSearchableSelect
              value={selectedProductIds}
              options={productsForSelect}
              placeholder="Seleziona uno o più prodotti..."
              searchPlaceholder="Cerca prodotto..."
              emptyMessage="Nessun prodotto trovato"
              onChange={setSelectedProductIds}
            />
          )}
        </div>

        {/* 5. Tabella per ogni prodotto */}
        {selectedProducts.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-muted-foreground">
              Quantità per prodotto
            </Label>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left font-medium p-3">Prodotto</th>
                    <th className="text-left font-medium p-3">Qta per ettaro</th>
                    <th className="text-left font-medium p-3">Unità</th>
                    <th className="text-left font-medium p-3">Qta totale prodotto</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map((p) => {
                    const row = productRows[p.registrationNumber];
                    if (!row) return null;
                    return (
                      <tr key={p.registrationNumber} className="border-b border-border last:border-0">
                        <td className="p-3 font-medium">{p.productName}</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.001"
                            min={0}
                            value={row.qtyPerHa}
                            onChange={(e) =>
                              updateProductRow(
                                p.registrationNumber,
                                "qtyPerHa",
                                e.target.value,
                              )
                            }
                            placeholder="0"
                            className="h-9 w-28"
                          />
                        </td>
                        <td className="p-3">
                          <Select
                            value={row.unitOfMeasure}
                            onValueChange={(v) =>
                              updateProductRow(
                                p.registrationNumber,
                                "unitOfMeasure",
                                v,
                              )
                            }
                          >
                            <SelectTrigger className="h-9 w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIT_MEASURE_OPTIONS.map((u) => (
                                <SelectItem key={u} value={u}>
                                  {u}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.001"
                            min={0}
                            value={row.totalQty}
                            onChange={(e) =>
                              updateProductRow(
                                p.registrationNumber,
                                "totalQty",
                                e.target.value,
                              )
                            }
                            placeholder="0"
                            className="h-9 w-28"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Data operazione */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground">
            Data operazione <span className="text-red-500">*</span>
          </Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full sm:w-auto justify-start text-left font-normal h-11",
                  !dateOfOperation && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateOfOperation
                  ? format(dateOfOperation, "dd/MM/yyyy", { locale: it })
                  : "Seleziona data..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateOfOperation}
                onSelect={(date) => {
                  if (date) {
                    setDateOfOperation(date);
                    setDatePickerOpen(false);
                  }
                }}
                locale={it}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => navigate("/job")}
            className="h-11"
          >
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSave || isSubmitting}
            className="h-11"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Crea operazioni"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
