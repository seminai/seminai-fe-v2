import * as React from "react";
import { useMemo, useState, useEffect, useRef } from "react";

import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Ruler,
  Search,
  Trash2,
  Pencil,
  CheckCircle,
  SplitSquareVertical,
  MoveRight,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

import { calculateCropDates, getBaseFieldIdFromAllocation } from "../utils";
import { CultivarCatalog } from "../models/CultivarCatalog";
import type {
  CropVariety,
  DateRange,
  FieldWithCompany,
  ProductionUnitInput,
  ProductionUnitSplitPart,
} from "../types";
import { SplitProductionUnitDialog } from "./SplitProductionUnitDialog";

const NO_CULTIVAR_VALUE = "__cultivar_none__";

class ProductionUnitFormStateFactory {
  private readonly allocatedFields: Map<string, number>;
  private readonly productionUnits: ProductionUnitInput[];

  constructor(
    allocatedFields: Map<string, number>,
    productionUnits: ProductionUnitInput[],
  ) {
    this.allocatedFields = allocatedFields;
    this.productionUnits = productionUnits;
  }

  public build(editingUnitId?: string): ProductionUnitInput {
    if (editingUnitId) {
      const unitToEdit = this.productionUnits.find(
        (unit) => unit.id === editingUnitId,
      );
      if (unitToEdit) {
        return this.buildFromExisting(unitToEdit);
      }
    }

    return this.buildNew();
  }

  private buildFromExisting(unit: ProductionUnitInput): ProductionUnitInput {
    return {
      ...unit,
      allocations: new Map(this.allocatedFields),
    };
  }

  private buildNew(): ProductionUnitInput {
    return {
      id: `pu-${Date.now()}`,
      name: "",
      cropCode: "",
      cultivarId: null,
      totalAreaHa: null,
      allocations: new Map(this.allocatedFields),
      protectionStructure: "",
      occupazione: "",
      destinazioneDiUso: "",
      acquaTotalePeridoL: 0,
      customSowingDate: null,
      customFloweringDate: null,
      customHarvestingDate: null,
    };
  }
}

type SingleProductionUnitFormProps = {
  cropVarieties: CropVariety[];
  isLoadingVarieties: boolean;
  cultivarCatalog: CultivarCatalog | null;
  isLoadingCultivars: boolean;
  cultivarCatalogError?: Error | null;
  allocatedFields: Map<string, number>;
  allFields: FieldWithCompany[];
  dateRange: DateRange;
  productionUnits: ProductionUnitInput[];
  editingUnitId?: string;
  showList: boolean;
  onSave: (unit: ProductionUnitInput) => void;
  onAddAnother: () => void;
  onNext: () => void;
  onCancel: () => void;
  onEditUnit: (unitId: string) => void;
  onDeleteUnit: (unitId: string) => void;
  onDeleteUnits: (unitIds: string[]) => void;
  onSplitUnit: (unitId: string, parts: ProductionUnitSplitPart[]) => void;
  onMoveField?: (
    sourceUnitId: string,
    targetUnitId: string,
    fieldId: string,
    areaHa: number,
  ) => void;
  onRemoveFieldFromUnit?: (
    unitId: string,
    fieldId: string,
    areaHa: number,
  ) => void;
  isCreating: boolean;
  /** When true, the bottom footer bar (Aggiungi + Crea) is hidden in list view */
  hideFooter?: boolean;
};

export const SingleProductionUnitForm: React.FC<
  SingleProductionUnitFormProps
> = ({
  cropVarieties,
  isLoadingVarieties,
  cultivarCatalog,
  isLoadingCultivars,
  cultivarCatalogError,
  allocatedFields,
  allFields,
  dateRange,
  productionUnits,
  editingUnitId,
  showList,
  onSave,
  onAddAnother,
  onNext,
  onCancel,
  onEditUnit,
  onDeleteUnit,
  onDeleteUnits,
  onSplitUnit,
  onMoveField,
  onRemoveFieldFromUnit,
  isCreating,
  hideFooter = false,
}) => {
  const formStateFactory = useMemo(
    () => new ProductionUnitFormStateFactory(allocatedFields, productionUnits),
    [allocatedFields, productionUnits],
  );
  const [formData, setFormData] = useState<ProductionUnitInput>(() =>
    formStateFactory.build(editingUnitId),
  );

  const [cropSearchQuery, setCropSearchQuery] = useState("");
  const [cultivarSearchQuery, setCultivarSearchQuery] = useState("");
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(
    Boolean(editingUnitId),
  );
  const [harvestDateManuallyEdited, setHarvestDateManuallyEdited] =
    useState(false);
  const [splitDialogUnit, setSplitDialogUnit] =
    useState<ProductionUnitInput | null>(null);
  const [moveFieldDialog, setMoveFieldDialog] = useState<{
    sourceUnitId: string;
    fieldId: string;
    areaHa: number;
  } | null>(null);
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(
    () => new Set(),
  );
  const previousCultivarIdRef = useRef<string | null>(
    formData.cultivarId ?? null,
  );

  const selectedCrop = cropVarieties.find((v) => v.code === formData.cropCode);

  useEffect(() => {
    setFormData(formStateFactory.build(editingUnitId));
    setIsNameManuallyEdited(Boolean(editingUnitId));
    setCropSearchQuery("");
    setCultivarSearchQuery("");
    setHarvestDateManuallyEdited(false);
    previousCultivarIdRef.current = null;
  }, [editingUnitId, formStateFactory]);

  const filteredCropVarieties = useMemo(() => {
    if (!cropSearchQuery.trim()) return cropVarieties;
    const query = cropSearchQuery.toLowerCase();
    return cropVarieties.filter(
      (variety) =>
        variety.species.toLowerCase().includes(query) ||
        variety.cropType.toLowerCase().includes(query) ||
        variety.code.toLowerCase().includes(query),
    );
  }, [cropVarieties, cropSearchQuery]);

  const baseCultivarsForCrop = useMemo(() => {
    if (!cultivarCatalog || !selectedCrop) {
      return [];
    }
    return cultivarCatalog.getCultivarsForCrop(selectedCrop);
  }, [cultivarCatalog, selectedCrop]);

  const hasCatalogCultivars = baseCultivarsForCrop.length > 0;

  const availableCultivars = useMemo(() => {
    if (!cultivarSearchQuery.trim()) {
      return baseCultivarsForCrop;
    }
    const query = cultivarSearchQuery.toLowerCase();
    return baseCultivarsForCrop.filter((record) =>
      record.cultivar.toLowerCase().includes(query),
    );
  }, [baseCultivarsForCrop, cultivarSearchQuery]);

  const selectedCultivarRecord = useMemo(() => {
    if (!cultivarCatalog || !formData.cultivarId) {
      return null;
    }
    return cultivarCatalog.findById(formData.cultivarId);
  }, [cultivarCatalog, formData.cultivarId]);

  const defaultCropDates = selectedCrop
    ? calculateCropDates(selectedCrop, dateRange.start)
    : null;

  const recommendedHarvestDate = useMemo(() => {
    if (!cultivarCatalog || !formData.cultivarId) {
      return null;
    }
    return cultivarCatalog.getRecommendedHarvestDate(
      formData.cultivarId,
      dateRange.start,
    );
  }, [cultivarCatalog, formData.cultivarId, dateRange.start]);

  const cultivarReferenceLabel =
    (formData.cultivarId &&
      cultivarCatalog?.getReferenceLabel(formData.cultivarId)) ||
    null;

  const effectiveSowingDate =
    formData.customSowingDate || defaultCropDates?.sowingDate;
  const effectiveFloweringDate =
    formData.customFloweringDate || defaultCropDates?.floweringDate;
  const effectiveHarvestingDate =
    formData.customHarvestingDate || defaultCropDates?.harvestingDate;

  const totalAllocatedSAU = useMemo(() => {
    return Array.from(allocatedFields.values()).reduce(
      (sum, area) => sum + area,
      0,
    );
  }, [allocatedFields]);

  const filteredProductionUnits = useMemo(() => {
    const query = listSearchQuery.trim().toLowerCase();
    if (!query) return productionUnits;
    return productionUnits.filter((unit) => {
      const crop = cropVarieties.find((v) => v.code === unit.cropCode);
      const cropText = [
        crop?.species,
        crop?.cropType,
        unit.importedCropName,
        unit.importedCropType,
      ]
        .filter(Boolean)
        .join(" ");
      const parcelParts: string[] = [];
      for (const [fieldId] of unit.allocations.entries()) {
        const baseFieldId = getBaseFieldIdFromAllocation(fieldId);
        const detail = unit.allocationsWithDetails?.find(
          (d) => d.fieldId === fieldId || d.fieldId === baseFieldId,
        );
        const field = allFields.find((f) => f.id === baseFieldId);
        const name = detail?.fieldName ?? field?.name ?? "";
        const foglio = detail?.foglio ?? field?.foglio ?? "";
        const particella = detail?.particella ?? field?.particella ?? "";
        const sezione = detail?.sezione ?? field?.sezione ?? "";
        parcelParts.push(name, foglio, particella, sezione);
      }
      const cycleText = (unit.cycles ?? [])
        .map((c) =>
          [c.cropName, c.cropType, c.variety].filter(Boolean).join(" "),
        )
        .join(" ");
      const searchable = [unit.name, cropText, ...parcelParts, cycleText]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [productionUnits, cropVarieties, allFields, listSearchQuery]);

  // Genera automaticamente il nome dell'unità produttiva
  const generateAutoName = useMemo(() => {
    if (!selectedCrop) return "";

    // Ottieni i nomi dei campi allocati
    const fieldNames = Array.from(allocatedFields.keys())
      .map((allocationKey) => {
        const baseFieldId = getBaseFieldIdFromAllocation(allocationKey);
        const field = allFields.find((f) => f.id === baseFieldId);
        return field?.name;
      })
      .filter(Boolean);

    // Limita a massimo 3 campi nel nome per non farlo troppo lungo
    const fieldsText =
      fieldNames.length > 3
        ? `${fieldNames.slice(0, 3).join(", ")} e altri ${
            fieldNames.length - 3
          }`
        : fieldNames.join(", ");

    return `${selectedCrop.species} - ${fieldsText}`;
  }, [selectedCrop, allocatedFields, allFields]);

  // Auto-compila il nome quando viene selezionata la coltura
  useEffect(() => {
    if (selectedCrop && !isNameManuallyEdited && generateAutoName) {
      setFormData((prev) => ({
        ...prev,
        name: generateAutoName,
      }));
    }
  }, [selectedCrop, generateAutoName, isNameManuallyEdited]);

  useEffect(() => {
    const currentCultivarId = formData.cultivarId ?? null;
    if (previousCultivarIdRef.current !== currentCultivarId) {
      previousCultivarIdRef.current = currentCultivarId;
      setHarvestDateManuallyEdited(false);
    }
  }, [formData.cultivarId]);

  useEffect(() => {
    if (!recommendedHarvestDate || harvestDateManuallyEdited) {
      return;
    }
    setFormData((prev) => {
      const current = prev.customHarvestingDate;
      if (current && current.getTime() === recommendedHarvestDate.getTime()) {
        return prev;
      }
      return {
        ...prev,
        customHarvestingDate: recommendedHarvestDate,
      };
    });
  }, [recommendedHarvestDate, harvestDateManuallyEdited, setFormData]);

  const handleSave = () => {
    // Nome è obbligatorio, coltura può venire dai dati importati
    if (!formData.name) {
      toast.error("Compila il campo Nome");
      return;
    }

    // Coltura è obbligatoria solo se non abbiamo dati importati
    if (!formData.cropCode && !formData.importedCropName) {
      toast.error("Seleziona una coltura");
      return;
    }

    // Salva l'unità
    onSave(formData);
    toast.success(
      editingUnitId
        ? "Unità produttiva aggiornata con successo!"
        : "Unità produttiva creata con successo!",
    );
  };

  const handleAddAnother = () => {
    // Torna allo step 1 per aggiungere un'altra UP
    onAddAnother();
  };

  const handleProceedToConfirmation = () => {
    // Vai allo step 3 per confermare tutte le UP create
    onNext();
  };

  if (isLoadingVarieties || isLoadingCultivars) {
    const loadingLabel = isLoadingVarieties
      ? "Caricamento varietà..."
      : "Caricamento cultivar...";
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size={24} ariaLabel="Caricamento varietà" />
        <span className="ml-2">{loadingLabel}</span>
      </div>
    );
  }

  if (showList) {
    // Visualizzazione lista unità produttive create: area scrollabile + barra fissa sotto
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-auto min-h-0">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Unità Produttive create ({productionUnits.length})
                {listSearchQuery.trim() && (
                  <span className="text-base font-normal text-gray-500">
                    — {filteredProductionUnits.length} mostrate
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Cerca per nome unità, dati parcellari o coltura"
                    value={listSearchQuery}
                    onChange={(e) => setListSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 whitespace-nowrap">
                    <Checkbox
                      checked={
                        filteredProductionUnits.length > 0 &&
                        filteredProductionUnits.every((u) =>
                          selectedUnitIds.has(u.id),
                        )
                      }
                      onCheckedChange={(_checked) => {
                        if (filteredProductionUnits.length === 0) return;
                        const allSelected = filteredProductionUnits.every((u) =>
                          selectedUnitIds.has(u.id),
                        );
                        setSelectedUnitIds((prev) => {
                          const next = new Set(prev);
                          if (allSelected) {
                            filteredProductionUnits.forEach((u) =>
                              next.delete(u.id),
                            );
                          } else {
                            filteredProductionUnits.forEach((u) =>
                              next.add(u.id),
                            );
                          }
                          return next;
                        });
                      }}
                      aria-label="Seleziona tutto"
                    />
                    Seleziona tutto
                  </label>
                  {selectedUnitIds.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        onDeleteUnits(Array.from(selectedUnitIds));
                        setSelectedUnitIds(new Set());
                        toast.success(
                          `${selectedUnitIds.size} unità eliminate`,
                        );
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Elimina selezionate ({selectedUnitIds.size})
                    </Button>
                  )}
                </div>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {filteredProductionUnits.map((unit) => {
                  const crop = cropVarieties.find(
                    (v) => v.code === unit.cropCode,
                  );
                  const unitTotalArea =
                    unit.totalAreaHa ??
                    Array.from(unit.allocations.values()).reduce(
                      (sum, area) => sum + area,
                      0,
                    );
                  const cultivarLabel =
                    (unit.cultivarId &&
                      cultivarCatalog?.getCultivarLabel(unit.cultivarId)) ||
                    unit.importedVariety ||
                    crop?.code;

                  return (
                    <AccordionItem
                      key={unit.id}
                      value={unit.id}
                      className="border rounded-lg mb-2 px-4"
                    >
                      <div className="flex items-center justify-between py-4">
                        <AccordionTrigger className="hover:no-underline py-0 flex-1">
                          <div className="flex items-center gap-4 text-left">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {unit.name}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {crop?.species ?? unit.importedCropName ?? "—"}{" "}
                                • {unitTotalArea.toFixed(2)} Ha
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-2 ml-4">
                          <div
                            className="flex items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedUnitIds.has(unit.id)}
                              onCheckedChange={(checked) => {
                                setSelectedUnitIds((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.add(unit.id);
                                  else next.delete(unit.id);
                                  return next;
                                });
                              }}
                              aria-label={`Seleziona ${unit.name}`}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditUnit(unit.id);
                            }}
                            title="Modifica"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSplitDialogUnit(unit);
                            }}
                            title="Fraziona"
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          >
                            <SplitSquareVertical className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteUnit(unit.id);
                            }}
                            title="Elimina"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <AccordionContent>
                        <div className="pt-2 pb-4 space-y-4 border-t mt-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700 block">
                                Coltura:
                              </span>
                              {crop?.species != null
                                ? `${crop.species}${crop.cropType ? ` (${crop.cropType})` : ""}`
                                : unit.importedCropName != null
                                  ? `${unit.importedCropName}${unit.importedCropType ? ` (${unit.importedCropType})` : ""}`
                                  : "N/A"}
                            </div>
                            <div>
                              <span className="font-medium text-gray-700 block">
                                Varietà:
                              </span>
                              {cultivarLabel || "N/A"}
                            </div>
                            {unit.protectionStructure && (
                              <div>
                                <span className="font-medium text-gray-700 block">
                                  Struttura:
                                </span>
                                {unit.protectionStructure}
                              </div>
                            )}
                            {unit.destinazioneDiUso && (
                              <div>
                                <span className="font-medium text-gray-700 block">
                                  Destinazione:
                                </span>
                                {unit.destinazioneDiUso}
                              </div>
                            )}
                          </div>
                          {unit.cycles && unit.cycles.length > 0 && (
                            <div>
                              <span className="font-medium text-gray-700 block mb-2">
                                Cicli:
                              </span>
                              <div className="space-y-2">
                                {unit.cycles.map((cycle) => (
                                  <div
                                    key={cycle.cycleIndex}
                                    className="bg-gray-50 p-3 rounded border border-gray-200"
                                  >
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="font-medium text-gray-600 block text-xs">
                                          Coltura
                                        </span>
                                        {cycle.cropName != null
                                          ? `${cycle.cropName}${cycle.cropType ? ` (${cycle.cropType})` : ""}`
                                          : "—"}
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600 block text-xs">
                                          Varietà
                                        </span>
                                        {cycle.variety ?? "—"}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-700 block mb-2">
                              Campi Allocati:
                            </span>
                            <div className="space-y-2">
                              {Array.from(unit.allocations.entries()).map(
                                ([fieldId, area]) => {
                                  const baseFieldId =
                                    getBaseFieldIdFromAllocation(fieldId);
                                  // Cerca dettagli in allocationsWithDetails (dati importati)
                                  const detailFromImport =
                                    unit.allocationsWithDetails?.find(
                                      (d) =>
                                        d.fieldId === fieldId ||
                                        d.fieldId === baseFieldId,
                                    );
                                  // Cerca dettagli in allFields (dati da ricerca disponibilità)
                                  const fieldFromSearch = allFields.find(
                                    (f) => f.id === baseFieldId,
                                  );
                                  // Merge: priorità a allocationsWithDetails, poi allFields
                                  const displayName =
                                    detailFromImport?.fieldName ||
                                    fieldFromSearch?.name ||
                                    "Campo";
                                  const displayFoglio =
                                    detailFromImport?.foglio ||
                                    fieldFromSearch?.foglio ||
                                    null;
                                  const displayParticella =
                                    detailFromImport?.particella ||
                                    fieldFromSearch?.particella ||
                                    null;
                                  const displaySezione =
                                    detailFromImport?.sezione ||
                                    fieldFromSearch?.sezione ||
                                    null;

                                  return (
                                    <div
                                      key={fieldId}
                                      className="bg-gray-50 p-3 rounded border border-gray-200"
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1">
                                          <h5 className="font-semibold text-gray-900">
                                            {displayName}
                                          </h5>
                                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                                            {displayFoglio && (
                                              <span className="flex items-center gap-1">
                                                <Ruler className="h-3 w-3" />
                                                Foglio {displayFoglio}
                                              </span>
                                            )}
                                            {displayParticella && (
                                              <span>
                                                Part. {displayParticella}
                                              </span>
                                            )}
                                            {displaySezione && (
                                              <span>Sez. {displaySezione}</span>
                                            )}
                                          </div>
                                        </div>
                                        <span className="font-bold text-gray-900 text-sm">
                                          {area.toFixed(2)} Ha
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 justify-end">
                                        {onMoveField &&
                                          productionUnits.length > 1 && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setMoveFieldDialog({
                                                  sourceUnitId: unit.id,
                                                  fieldId,
                                                  areaHa: area,
                                                });
                                              }}
                                              title="Sposta in altra unità produttiva"
                                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 px-2"
                                            >
                                              <MoveRight className="h-3 w-3 mr-1" />
                                              <span className="text-xs">
                                                Sposta
                                              </span>
                                            </Button>
                                          )}
                                        {onRemoveFieldFromUnit && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onRemoveFieldFromUnit(
                                                unit.id,
                                                fieldId,
                                                area,
                                              );
                                              toast.success(
                                                "Campo rimosso dall'unità produttiva",
                                              );
                                            }}
                                            title="Rimuovi campo"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              {filteredProductionUnits.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  {productionUnits.length === 0
                    ? "Nessuna unità produttiva presente."
                    : "Nessun risultato per la ricerca."}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {!hideFooter && (
          <div className="flex-shrink-0 border-t bg-white p-4 flex justify-between items-center gap-4">
            <Button variant="outline" onClick={handleAddAnother} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi un'altra unità produttiva
            </Button>
            <Button
              onClick={handleProceedToConfirmation}
              size="lg"
              disabled={productionUnits.length === 0 || isCreating}
              className="min-w-64 bg-green-600 hover:bg-green-700"
            >
              {isCreating ? (
                <>
                  <Spinner
                    size={16}
                    ariaLabel="Creazione in corso"
                    className="mr-2"
                  />
                  Creazione in corso...
                </>
              ) : (
                <>
                  Crea {productionUnits.length} Unità{" "}
                  {productionUnits.length === 1 ? "Produttiva" : "Produttive"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {splitDialogUnit && (
          <SplitProductionUnitDialog
            isOpen={!!splitDialogUnit}
            onClose={() => setSplitDialogUnit(null)}
            unit={splitDialogUnit}
            onConfirm={(parts) => {
              onSplitUnit(splitDialogUnit.id, parts);
              setSplitDialogUnit(null);
            }}
          />
        )}

        {moveFieldDialog && onMoveField && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Sposta Campo</CardTitle>
                <p className="text-sm text-gray-600">
                  Seleziona l'unità produttiva di destinazione
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">
                    Campo da spostare:
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {allFields.find(
                      (f) =>
                        getBaseFieldIdFromAllocation(
                          moveFieldDialog.fieldId,
                        ) === f.id,
                    )?.name || "Campo"}{" "}
                    - {moveFieldDialog.areaHa.toFixed(2)} Ha
                  </p>
                </div>
                <div className="space-y-2">
                  {productionUnits
                    .filter((u) => u.id !== moveFieldDialog.sourceUnitId)
                    .map((targetUnit) => {
                      const crop = cropVarieties.find(
                        (v) => v.code === targetUnit.cropCode,
                      );
                      return (
                        <Button
                          key={targetUnit.id}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-3"
                          onClick={() => {
                            onMoveField(
                              moveFieldDialog.sourceUnitId,
                              targetUnit.id,
                              moveFieldDialog.fieldId,
                              moveFieldDialog.areaHa,
                            );
                            setMoveFieldDialog(null);
                            toast.success("Campo spostato con successo!");
                          }}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">
                              {targetUnit.name}
                            </span>
                            <span className="text-xs text-gray-600">
                              {crop?.species} -{" "}
                              {Array.from(targetUnit.allocations.values())
                                .reduce((sum, a) => sum + a, 0)
                                .toFixed(2)}{" "}
                              Ha
                            </span>
                          </div>
                        </Button>
                      );
                    })}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setMoveFieldDialog(null)}
                >
                  Annulla
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {editingUnitId
            ? "Modifica Unità Produttiva"
            : "Configura Unità Produttiva"}
        </h2>
        <p className="text-gray-600">
          Completa i dati per l'unità produttiva con i campi selezionati
        </p>
      </div>

      {/* Campi allocati - Readonly */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <MapPin className="h-5 w-5" />
            Campi Selezionati ({allocatedFields.size})
          </CardTitle>
          <p className="text-sm text-blue-700 mt-1">
            Totale superficie allocata: {totalAllocatedSAU.toFixed(2)} Ha
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from(allocatedFields.entries()).map(
              ([allocationKey, areaHa]) => {
                const baseFieldId = getBaseFieldIdFromAllocation(allocationKey);
                const field = allFields.find((f) => f.id === baseFieldId);
                if (!field) return null;

                return (
                  <div
                    key={allocationKey}
                    className="bg-white rounded-lg p-4 border border-blue-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {field.name}
                        </h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {field.address ?? "N/A"}, {field.city ?? "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Ruler className="h-3 w-3" />
                            Foglio {field.foglio}, Part. {field.particella}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {field.companyName}
                        </p>
                      </div>
                      <Badge className="bg-green-600 text-white">
                        {areaHa.toFixed(2)} Ha
                      </Badge>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form dati unità produttiva */}
      <Card>
        <CardHeader>
          <CardTitle>Dettagli Unità Produttiva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prima: Selezione Coltura */}
          <div>
            <label className="text-sm font-medium">Coltura</label>
            <p className="text-xs text-gray-500 mt-1 mb-2">
              {formData.importedCropName && !formData.cropCode
                ? "Dati coltura importati dal backend. Puoi opzionalmente abbinare a una coltura locale."
                : "Seleziona prima la coltura per auto-compilare il nome dell'unità produttiva"}
            </p>

            {/* Mostra dati importati se presenti e non abbinati */}
            {formData.importedCropName && !selectedCrop && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                <p className="font-medium text-amber-900 mb-1">
                  Dati importati dal backend:
                </p>
                <div className="grid grid-cols-2 gap-2 text-amber-800">
                  {formData.importedCropName && (
                    <div>
                      <span className="text-xs text-amber-600">
                        Nome coltura:
                      </span>
                      <p className="font-medium">{formData.importedCropName}</p>
                    </div>
                  )}
                  {formData.importedCropType && (
                    <div>
                      <span className="text-xs text-amber-600">Tipo:</span>
                      <p className="font-medium">{formData.importedCropType}</p>
                    </div>
                  )}
                  {formData.importedVariety && (
                    <div>
                      <span className="text-xs text-amber-600">Varietà:</span>
                      <p className="font-medium">{formData.importedVariety}</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  Questi dati verranno usati se non selezioni una coltura
                  locale.
                </p>
              </div>
            )}

            <Select
              value={formData.cropCode}
              onValueChange={(value) => {
                setFormData({
                  ...formData,
                  cropCode: value,
                  cultivarId: null,
                  importedVariety: null,
                });
                setCropSearchQuery("");
                setCultivarSearchQuery("");
                // Se l'utente non ha modificato manualmente il nome, resetta il flag
                // così il nuovo nome auto-generato verrà applicato
                if (!editingUnitId) {
                  setIsNameManuallyEdited(false);
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue
                  placeholder={
                    formData.importedCropName
                      ? "(Opzionale) Abbina a coltura locale..."
                      : "Seleziona una varietà..."
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                <div className="sticky top-0 z-10 bg-white border-b p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cerca coltura..."
                      value={cropSearchQuery}
                      onChange={(e) => setCropSearchQuery(e.target.value)}
                      className="pl-8"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto">
                  {filteredCropVarieties.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      Nessuna coltura trovata
                    </div>
                  ) : (
                    filteredCropVarieties.map((variety) => (
                      <SelectItem key={variety.code} value={variety.code}>
                        <div className="flex flex-col">
                          <span className="font-medium">{variety.species}</span>
                          <span className="text-xs text-gray-500">
                            {variety.cropType} • {variety.code}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </div>

                {cropSearchQuery && (
                  <div className="sticky bottom-0 bg-gray-50 border-t p-2 text-xs text-gray-600 text-center">
                    {filteredCropVarieties.length} colture trovate su{" "}
                    {cropVarieties.length}
                  </div>
                )}
              </SelectContent>
            </Select>
            {selectedCrop && (
              <div className="mt-2 p-3 bg-blue-50 rounded text-sm">
                <p className="font-medium text-blue-900">
                  {selectedCrop.species}
                </p>
                <p className="text-gray-600 mt-1">
                  Resa stimata: {selectedCrop.estimatedYield.min} -{" "}
                  {selectedCrop.estimatedYield.max} kg/ha
                </p>
              </div>
            )}
          </div>

          {selectedCrop && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Cultivar</label>
                {(formData.cultivarId || formData.importedVariety) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        cultivarId: null,
                        importedVariety: null,
                      });
                      setCultivarSearchQuery("");
                    }}
                  >
                    Rimuovi selezione
                  </Button>
                )}
              </div>

              {!cultivarCatalog && cultivarCatalogError && (
                <p className="text-xs text-red-600">
                  Dataset cultivar non disponibile. Puoi continuare senza
                  selezionare la cultivar.
                </p>
              )}

              {cultivarCatalog && hasCatalogCultivars && (
                <>
                  <Select
                    value={formData.cultivarId ?? NO_CULTIVAR_VALUE}
                    onValueChange={(value) => {
                      if (value === NO_CULTIVAR_VALUE) {
                        setFormData({ ...formData, cultivarId: null });
                        return;
                      }
                      setFormData({
                        ...formData,
                        cultivarId: value,
                        importedVariety: null,
                      });
                      setCultivarSearchQuery("");
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleziona una cultivar..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[360px]">
                      <SelectItem value={NO_CULTIVAR_VALUE}>
                        Nessuna cultivar
                      </SelectItem>
                      <div className="sticky top-0 z-10 bg-white border-b p-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Cerca cultivar..."
                            value={cultivarSearchQuery}
                            onChange={(e) =>
                              setCultivarSearchQuery(e.target.value)
                            }
                            className="pl-8"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="max-h-[260px] overflow-y-auto">
                        {availableCultivars.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            Nessuna cultivar trovata
                          </div>
                        ) : (
                          availableCultivars.map((cultivar) => (
                            <SelectItem key={cultivar.id} value={cultivar.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {cultivar.cultivar}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {cultivar.species} • {cultivar.harvestLabel}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                  {selectedCultivarRecord && cultivarReferenceLabel && (
                    <p className="text-xs text-blue-600">
                      Data raccolta di riferimento: {cultivarReferenceLabel}
                    </p>
                  )}
                </>
              )}

              {cultivarCatalog && !hasCatalogCultivars && (
                <>
                  <Input
                    placeholder="es. Sangiovese, Trebbiano..."
                    value={formData.importedVariety ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        importedVariety: e.target.value || null,
                      })
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Nessuna cultivar nel catalogo per questa coltura. Puoi
                    inserirla manualmente.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Poi: Nome Unità Produttiva (auto-compilato) */}
          <div>
            <label className="text-sm font-medium">
              Nome Unità Produttiva *
            </label>
            {!isNameManuallyEdited && formData.name && selectedCrop && (
              <p className="text-xs text-green-600 mt-1 mb-1">
                ✓ Nome auto-generato. Puoi modificarlo se necessario.
              </p>
            )}
            <Input
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setIsNameManuallyEdited(true);
              }}
              placeholder="Seleziona prima una coltura..."
              className="mt-1"
              disabled={!selectedCrop}
            />
          </div>

          {selectedCrop && defaultCropDates && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">
                Calendario Colturale
                <span className="text-xs text-gray-500 ml-2">
                  (Date calcolate dalla coltura - modificabili)
                </span>
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    Data Semina o impianto
                  </label>
                  <DatePickerInput
                    value={effectiveSowingDate}
                    onChange={(date) =>
                      setFormData({
                        ...formData,
                        customSowingDate: date || null,
                      })
                    }
                    className="mt-1"
                  />
                  {!formData.customSowingDate && defaultCropDates && (
                    <p className="text-xs text-gray-500 mt-1">
                      Default: {selectedCrop.sowingPeriod.minDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Data Fioritura</label>
                  <DatePickerInput
                    value={effectiveFloweringDate}
                    onChange={(date) =>
                      setFormData({
                        ...formData,
                        customFloweringDate: date || null,
                      })
                    }
                    className="mt-1"
                  />
                  {!formData.customFloweringDate && defaultCropDates && (
                    <p className="text-xs text-gray-500 mt-1">
                      Default: {selectedCrop.floweringPeriod.minDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Data Raccolta</label>
                  <DatePickerInput
                    value={effectiveHarvestingDate}
                    onChange={(date) => {
                      setHarvestDateManuallyEdited(true);
                      setFormData({
                        ...formData,
                        customHarvestingDate: date || null,
                      });
                    }}
                    className="mt-1"
                  />
                  {recommendedHarvestDate && (
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>
                        Suggerita:{" "}
                        {format(recommendedHarvestDate, "dd/MM/yyyy", {
                          locale: it,
                        })}
                        {cultivarReferenceLabel
                          ? ` (${cultivarReferenceLabel})`
                          : ""}
                      </span>
                      {harvestDateManuallyEdited && (
                        <Button
                          variant="link"
                          size="sm"
                          className="px-0"
                          onClick={() => {
                            setHarvestDateManuallyEdited(false);
                            setFormData((prev) => ({
                              ...prev,
                              customHarvestingDate: recommendedHarvestDate,
                            }));
                          }}
                        >
                          Usa suggerita
                        </Button>
                      )}
                    </div>
                  )}
                  {!formData.customHarvestingDate && defaultCropDates && (
                    <p className="text-xs text-gray-500 mt-1">
                      Default: {selectedCrop.harvestPeriod.minDate}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">
                Struttura Protezione
              </label>
              <Input
                value={formData.protectionStructure}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    protectionStructure: e.target.value,
                  })
                }
                placeholder="es. Serra, Tunnel, Campo aperto"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Occupazione</label>
              <Input
                value={formData.occupazione}
                onChange={(e) =>
                  setFormData({ ...formData, occupazione: e.target.value })
                }
                placeholder="es. Principale, Secondaria"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Destinazione d'Uso</label>
              <Input
                value={formData.destinazioneDiUso}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    destinazioneDiUso: e.target.value,
                  })
                }
                placeholder="es. Consumo fresco, Industria"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Acqua Totale (L)</label>
              <Input
                type="number"
                value={formData.acquaTotalePeridoL || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    acquaTotalePeridoL: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="es. 50000"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-4 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          {editingUnitId ? "Annulla Modifiche" : "Indietro - Modifica Campi"}
        </Button>
        <Button onClick={handleSave} size="lg">
          {editingUnitId
            ? "Aggiorna Unità Produttiva"
            : "Aggiungi Unità Produttiva"}{" "}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
