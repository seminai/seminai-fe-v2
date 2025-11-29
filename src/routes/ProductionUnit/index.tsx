import * as React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  type ProductionUnit,
  type ProductionUnitUpdateInput,
  type FieldInfo,
} from "@/api/production-unit";
import type { Company } from "@/api/companies";
import type { Field as CompanyField } from "@/api/fields";
import { Spinner } from "@/components/ui/spinner";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import { useCompanies } from "@/hooks/useCompanies";
import { useFields } from "@/hooks/useFields";
import { PageHeader } from "@/components/organism/Header";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SearchableSelect } from "@/components/ui/searchable-select";

type CropPeriod = {
  minDate: string;
  maxDate: string;
};

type CropCatalogItem = {
  code: string;
  species: string;
  cropType: string;
  sowingPeriod: CropPeriod;
  floweringPeriod: CropPeriod;
  harvestPeriod: CropPeriod;
  estimatedYield: {
    min: number;
    max: number;
  };
};

type CropSelection = {
  species: string;
  cropType: string;
  code: string;
};

class CropCatalog {
  private readonly items: CropCatalogItem[];
  private readonly byCode: Map<string, CropCatalogItem>;
  private readonly speciesOptions: Array<{ label: string; value: string }>;
  private readonly cropTypeOptions: Array<{ label: string; value: string }>;
  private readonly varietyOptions: Array<{ label: string; value: string }>;
  private readonly codeToLabel: Map<string, { label: string; value: string }>;

  constructor(items: CropCatalogItem[]) {
    this.items = items;
    this.byCode = new Map(items.map((item) => [item.code, item]));
    this.speciesOptions = this.buildOptions(items.map((item) => item.species));
    this.cropTypeOptions = this.buildOptions(
      items.map((item) => item.cropType)
    );
    this.codeToLabel = new Map(
      items.map((item) => [
        item.code,
        {
          label: `${item.species} • ${item.cropType} (${item.code})`,
          value: item.code,
        },
      ])
    );
    this.varietyOptions = Array.from(this.codeToLabel.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }

  private buildOptions(
    values: string[],
    mapFn?: (value: string) => { label: string; value: string }
  ): Array<{ label: string; value: string }> {
    const unique = Array.from(new Set(values)).sort((a, b) =>
      a.localeCompare(b)
    );
    return unique.map((value) =>
      mapFn ? mapFn(value) : { label: value, value }
    );
  }

  private toSelection(item: CropCatalogItem): CropSelection {
    return {
      species: item.species,
      cropType: item.cropType,
      code: item.code,
    };
  }

  public getSpeciesOptions(): Array<{ label: string; value: string }> {
    return this.speciesOptions;
  }

  public getCropTypeOptions(): Array<{ label: string; value: string }> {
    return this.cropTypeOptions;
  }

  public getVarietyOptions(): Array<{ label: string; value: string }> {
    return this.varietyOptions;
  }

  public getVarietyLabel(code: string): string {
    return this.codeToLabel.get(code)?.label ?? code;
  }

  public resolve(
    rowData: Record<string, unknown>,
    overrides: Partial<CropSelection>
  ): CropSelection | null {
    const current: Partial<CropSelection> = {
      species:
        typeof rowData.cropName === "string" ? rowData.cropName : undefined,
      cropType:
        typeof rowData.cropType === "string" ? rowData.cropType : undefined,
      code: typeof rowData.variety === "string" ? rowData.variety : undefined,
    };

    const request: Partial<CropSelection> = {
      ...current,
      ...overrides,
    };

    if (request.code) {
      const matchByCode = this.byCode.get(request.code);
      if (matchByCode) {
        return this.toSelection(matchByCode);
      }
    }

    let candidates = this.items;

    if (request.species) {
      candidates = candidates.filter(
        (item) => item.species === request.species
      );
    }

    if (request.cropType) {
      candidates = candidates.filter(
        (item) => item.cropType === request.cropType
      );
    }

    if (candidates.length === 0) {
      return null;
    }

    if (request.code) {
      const candidateByCode = candidates.find(
        (item) => item.code === request.code
      );
      if (candidateByCode) {
        return this.toSelection(candidateByCode);
      }
    }

    if (current.code) {
      const stillValid = candidates.find((item) => item.code === current.code);
      if (stillValid) {
        return this.toSelection(stillValid);
      }
    }

    return this.toSelection(candidates[0]);
  }

  public buildSelection(
    rowData: Record<string, unknown>,
    overrides: Partial<CropSelection>
  ): CropSelection {
    const shouldClear = Object.values(overrides).some(
      (value) => typeof value === "string" && value.length === 0
    );

    if (shouldClear) {
      return { species: "", cropType: "", code: "" };
    }

    const resolved = this.resolve(rowData, overrides);

    if (resolved) {
      return resolved;
    }

    return {
      species:
        overrides.species !== undefined
          ? String(overrides.species)
          : typeof rowData.cropName === "string"
          ? rowData.cropName
          : "",
      cropType:
        overrides.cropType !== undefined
          ? String(overrides.cropType)
          : typeof rowData.cropType === "string"
          ? rowData.cropType
          : "",
      code:
        overrides.code !== undefined
          ? String(overrides.code)
          : typeof rowData.variety === "string"
          ? rowData.variety
          : "",
    };
  }
}

class CompanyDirectory {
  private readonly companyOptions: Array<{ label: string; value: string }>;
  private readonly companyNameById: Map<string, string>;
  private readonly fieldsByCompany: Map<
    string,
    Array<{ label: string; value: string }>
  >;
  private readonly fieldInfoById: Map<string, FieldInfo>;

  constructor(companies: Company[], fields: CompanyField[]) {
    this.companyNameById = new Map(
      companies.map((company) => [company.id, company.name])
    );
    this.companyOptions = companies
      .map((company) => ({
        label: company.name,
        value: company.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    this.fieldsByCompany = new Map();
    this.fieldInfoById = new Map();

    fields.forEach((field) => {
      const option = { label: field.name, value: field.id };
      const list = this.fieldsByCompany.get(field.companyId) ?? [];
      list.push(option);
      this.fieldsByCompany.set(field.companyId, list);
      this.fieldInfoById.set(field.id, CompanyDirectory.buildFieldInfo(field));
    });

    this.fieldsByCompany.forEach((options) =>
      options.sort((first, second) =>
        first.label.localeCompare(second.label, "it", {
          sensitivity: "base",
        })
      )
    );
  }

  private static buildFieldInfo(field: CompanyField): FieldInfo {
    const areaHaValue = (field as CompanyField & { areaHa?: number | null })
      .areaHa;
    return {
      id: field.id,
      name: field.name,
      sauHa: field.sauHa ?? 0,
      gisHa: field.gisHa,
      areaHaOnField:
        typeof areaHaValue === "number" ? areaHaValue : field.sauHa ?? 0,
    };
  }

  public getCompanyOptions(): Array<{ label: string; value: string }> {
    return this.companyOptions;
  }

  public getCompanyName(companyId: string): string {
    if (!companyId) {
      return "";
    }
    return this.companyNameById.get(companyId) ?? companyId;
  }

  public getFieldsOptions(
    companyId: string | undefined
  ): Array<{ label: string; value: string }> {
    if (!companyId) {
      return [];
    }
    return this.fieldsByCompany.get(companyId) ?? [];
  }

  public getFieldInfo(fieldId: string): FieldInfo | null {
    if (!fieldId) {
      return null;
    }
    return this.fieldInfoById.get(fieldId) ?? null;
  }
}

const buildProductionUnitColumns = (
  catalog: CropCatalog | null,
  directory: CompanyDirectory | null
): EditableColumn[] => {
  const speciesOptions = catalog?.getSpeciesOptions() ?? [];
  const cropTypeOptions = catalog?.getCropTypeOptions() ?? [];
  const varietyOptions = catalog?.getVarietyOptions() ?? [];
  const companyOptions = directory?.getCompanyOptions() ?? [];

  return [
    {
      id: "companyName",
      title: "Azienda",
      type: "select",
      options: companyOptions,
      placeholder: "Seleziona azienda",
      enableSearch: true,
      searchPlaceholder: "Cerca azienda...",
      emptyStateMessage: "Nessuna azienda trovata",
      noneOptionLabel: "Nessuna selezione",
      onValueChange: ({ value }) => {
        const sanitizedValue =
          typeof value === "string" ? value : String(value ?? "");

        if (!directory) {
          return {
            companyName: sanitizedValue,
            companyId: sanitizedValue,
          };
        }

        if (sanitizedValue === "") {
          return {
            companyName: "",
            companyId: "",
            fieldSelection: "",
            fields: [],
          };
        }

        const label = directory.getCompanyName(sanitizedValue);
        return {
          companyName: label,
          companyId: sanitizedValue,
          fieldSelection: "",
          fields: [],
        };
      },
    },
    {
      id: "name",
      title: "Nome Unità Produttiva",
      type: "text",
    },
    {
      id: "cropName",
      title: "Coltura",
      type: "select",
      options: speciesOptions,
      placeholder: "Seleziona coltura",
      enableSearch: true,
      searchPlaceholder: "Cerca coltura...",
      emptyStateMessage: "Nessuna coltura trovata",
      noneOptionLabel: "Nessuna selezione",
      onValueChange: ({ value, rowData }) => {
        const sanitizedValue =
          typeof value === "string" ? value : String(value ?? "");

        if (!catalog) {
          return sanitizedValue === ""
            ? { cropName: "", cropType: "", variety: "" }
            : { cropName: sanitizedValue };
        }

        const selection = catalog.buildSelection(rowData, {
          species: sanitizedValue,
        });

        return {
          cropName: selection.species,
          cropType: selection.cropType,
          variety: selection.code,
        };
      },
    },
    {
      id: "cropType",
      title: "Tipo Coltura",
      type: "select",
      options: cropTypeOptions,
      placeholder: "Seleziona tipo coltura",
      enableSearch: true,
      searchPlaceholder: "Cerca tipo coltura...",
      emptyStateMessage: "Nessun tipo coltura trovato",
      noneOptionLabel: "Nessuna selezione",
      onValueChange: ({ value, rowData }) => {
        const sanitizedValue =
          typeof value === "string" ? value : String(value ?? "");

        if (!catalog) {
          return sanitizedValue === ""
            ? { cropName: "", cropType: "", variety: "" }
            : { cropType: sanitizedValue };
        }

        const selection = catalog.buildSelection(rowData, {
          cropType: sanitizedValue,
        });

        return {
          cropName: selection.species,
          cropType: selection.cropType,
          variety: selection.code,
        };
      },
    },
    {
      id: "variety",
      title: "Varietà",
      type: "select",
      options: varietyOptions,
      placeholder: "Seleziona varietà",
      enableSearch: true,
      searchPlaceholder: "Cerca varietà...",
      emptyStateMessage: "Nessuna varietà trovata",
      noneOptionLabel: "Nessuna selezione",
      render: (value: unknown) => {
        if (!catalog) {
          return String(value ?? "");
        }
        return catalog.getVarietyLabel(String(value ?? ""));
      },
      onValueChange: ({ value, rowData }) => {
        const sanitizedValue =
          typeof value === "string" ? value : String(value ?? "");

        if (!catalog) {
          return sanitizedValue === ""
            ? { cropName: "", cropType: "", variety: "" }
            : { variety: sanitizedValue };
        }

        const selection = catalog.buildSelection(rowData, {
          code: sanitizedValue,
        });

        return {
          cropName: selection.species,
          cropType: selection.cropType,
          variety: selection.code,
        };
      },
    },
    {
      id: "protocoll",
      title: "Protocollo",
      type: "text",
    },
    {
      id: "areaHa",
      title: "Area (Ha)",
      type: "number",
    },
    {
      id: "protectionStructure",
      title: "Struttura Protezione",
      type: "text",
    },
    {
      id: "fieldSelection",
      title: "Campi",
      type: "select",
      placeholder: "Seleziona campo",
      enableSearch: true,
      searchPlaceholder: "Cerca campo...",
      emptyStateMessage: "Nessun campo trovato",
      noneOptionLabel: "Nessuna selezione",
      getOptions: (rowData) => {
        if (!directory) {
          return [];
        }
        const companyId =
          typeof rowData.companyId === "string" ? rowData.companyId : "";
        return directory.getFieldsOptions(companyId);
      },
      render: (_value: unknown, rowData: Record<string, unknown>) => {
        const fields = rowData.fields as FieldInfo[] | undefined;
        if (!fields || fields.length === 0) {
          return <span className="text-gray-400">0 campi</span>;
        }
        const countLabel = fields.length === 1 ? "1 campo" : `${fields.length} campi`;
        return <Badge variant="secondary">{countLabel}</Badge>;
      },
      onValueChange: ({ value, rowData }) => {
        const sanitizedValue =
          typeof value === "string" ? value : String(value ?? "");

        if (!directory) {
          return { fieldSelection: sanitizedValue };
        }

        if (sanitizedValue === "") {
          return { fieldSelection: "", fields: [] };
        }

        const fieldInfo = directory.getFieldInfo(sanitizedValue);

        return {
          fieldSelection: sanitizedValue,
          fields: fieldInfo
            ? [fieldInfo]
            : (rowData.fields as FieldInfo[]) ?? [],
        };
      },
    },
    {
      id: "startDate",
      title: "Data Inizio",
      type: "date",
    },
    {
      id: "endDate",
      title: "Data Fine",
      type: "date",
    },
  ];
};

export default function ProductionUnit(): React.ReactElement {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<ProductionUnitUpdateInput>(
    {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [cropCatalog, setCropCatalog] = useState<CropCatalog | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<Error | null>(null);
  const [selectedField, setSelectedField] = useState<FieldInfo | null>(null);
  const [isFieldDrawerOpen, setIsFieldDrawerOpen] = useState(false);

  const { productionUnits, isLoading, error, refetch } = useProductionUnit();
  const { companies } = useCompanies();
  const { fields: availableFields } = useFields();

  const companyDirectory = useMemo(() => {
    if (companies.length === 0 && availableFields.length === 0) {
      return null;
    }
    return new CompanyDirectory(companies, availableFields);
  }, [companies, availableFields]);

  const handleFieldClick = useCallback((field: FieldInfo) => {
    setSelectedField(field);
    setIsFieldDrawerOpen(true);
  }, []);

  const handleCloseFieldDrawer = useCallback(() => {
    setIsFieldDrawerOpen(false);
    setSelectedField(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      try {
        const response = await fetch("/datasets/varietà/index.json");
        if (!response.ok) {
          throw new Error("Impossibile caricare le varietà");
        }
        const data = (await response.json()) as CropCatalogItem[];
        if (!isMounted) return;
        setCropCatalog(new CropCatalog(data));
      } catch (err) {
        if (!isMounted) return;
        setCatalogError(
          err instanceof Error
            ? err
            : new Error("Errore nel caricamento delle varietà")
        );
      } finally {
        if (isMounted) {
          setIsCatalogLoading(false);
        }
      }
    };

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (catalogError) {
      toast.error(catalogError.message);
    }
  }, [catalogError]);

  // Converti i dati delle unità produttive in formato row per la tabella
  const rows = useMemo(() => {
    return productionUnits.map((pu) => ({
      id: pu.productionUnit.id,
      companyId: pu.companyId,
      companyName: pu.companyName,
      name: pu.productionUnit.name,
      cropName: pu.productionUnit.cropName,
      cropType: pu.productionUnit.cropType,
      variety: pu.productionUnit.variety,
      protocoll: pu.productionUnit.protocoll,
      areaHa: pu.productionUnit.areaHa,
      protectionStructure: pu.productionUnit.protectionStructure,
      fields: pu.fields || [],
      fieldSelection: pu.fields && pu.fields.length > 0 ? pu.fields[0].id : "",
      startDate: pu.productionUnit.startDate
        ? new Date(pu.productionUnit.startDate).toISOString().split("T")[0]
        : "",
      endDate: pu.productionUnit.endDate
        ? new Date(pu.productionUnit.endDate).toISOString().split("T")[0]
        : "",
      // Mantieni i dati completi per i dettagli
      productionUnit: pu,
    }));
  }, [productionUnits]);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const { productionUnitApiService } = await import(
        "@/api/production-unit"
      );
      await productionUnitApiService.delete(id);
      toast.success("Unità produttiva eliminata con successo");
      refetch();
      setDeletingId(null);
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nell'eliminazione dell'unità produttiva"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (productionUnit: ProductionUnit) => {
    const pu = productionUnit.productionUnit;
    setEditingId(pu.id);
    setEditFormData({
      name: pu.name,
      cropName: pu.cropName,
      cropType: pu.cropType,
      variety: pu.variety,
      protocoll: pu.protocoll,
      areaHa: pu.areaHa,
      protectionStructure: pu.protectionStructure,
      startDate: pu.startDate,
      floweringDate: pu.floweringDate,
      harvestingDate: pu.harvestingDate,
      endDate: pu.endDate,
      occupazione: pu.occupazione,
      destinazioneDiUso: pu.destinazioneDiUso,
      acquaTotalePeridoL: pu.acquaTotalePeridoL,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setIsSaving(true);
    try {
      const { productionUnitApiService } = await import(
        "@/api/production-unit"
      );
      await productionUnitApiService.update(editingId, editFormData);
      toast.success("Unità produttiva aggiornata con successo");
      refetch();
      setEditingId(null);
      setEditFormData({});
    } catch (error) {
      console.error("Errore nell'aggiornamento:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nell'aggiornamento dell'unità produttiva"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCropSelection = (overrides: Partial<CropSelection>) => {
    setEditFormData((prev) => {
      const normalized: Partial<CropSelection> = {
        species:
          overrides.species !== undefined
            ? String(overrides.species ?? "")
            : undefined,
        cropType:
          overrides.cropType !== undefined
            ? String(overrides.cropType ?? "")
            : undefined,
        code:
          overrides.code !== undefined
            ? String(overrides.code ?? "")
            : undefined,
      };

      if (!cropCatalog) {
        const shouldClear = Object.values(normalized).some(
          (value) => value === ""
        );

        if (shouldClear) {
          return {
            ...prev,
            cropName: "",
            cropType: "",
            variety: "",
          };
        }

        return {
          ...prev,
          ...(normalized.species !== undefined
            ? { cropName: normalized.species }
            : {}),
          ...(normalized.cropType !== undefined
            ? { cropType: normalized.cropType }
            : {}),
          ...(normalized.code !== undefined
            ? { variety: normalized.code }
            : {}),
        };
      }

      const selection = cropCatalog.buildSelection(
        {
          cropName: prev.cropName ?? "",
          cropType: prev.cropType ?? "",
          variety: prev.variety ?? "",
        },
        normalized
      );

      return {
        ...prev,
        cropName: selection.species,
        cropType: selection.cropType,
        variety: selection.code,
      };
    });
  };

  const handleBulkSave = async (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => {
    if (payload.updated.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const { productionUnitApiService } = await import(
        "@/api/production-unit"
      );

      // Converti i dati della tabella in formato API
      const productionUnitsToUpdate = payload.updated.map((row) => {
        const id = String(row.id ?? "");
        const updateData: Record<string, unknown> = {
          id,
        };

        // Aggiungi solo i campi che possono essere modificati
        if (row.name !== undefined) updateData.name = String(row.name);
        if (row.cropName !== undefined)
          updateData.cropName = String(row.cropName);
        if (row.cropType !== undefined)
          updateData.cropType = String(row.cropType);
        if (row.variety !== undefined) updateData.variety = String(row.variety);
        if (row.protocoll !== undefined)
          updateData.protocoll = String(row.protocoll);
        if (row.areaHa !== undefined) updateData.areaHa = Number(row.areaHa);
        if (row.protectionStructure !== undefined)
          updateData.protectionStructure = String(row.protectionStructure);
        if (row.startDate !== undefined)
          updateData.startDate = String(row.startDate);
        if (row.endDate !== undefined) updateData.endDate = String(row.endDate);

        return updateData;
      });

      await productionUnitApiService.bulkUpdate({
        productionUnits: productionUnitsToUpdate as Array<{
          id: string;
          name?: string;
          cropName?: string;
          cropType?: string;
          variety?: string;
          protocoll?: string;
          areaHa?: number;
          protectionStructure?: string;
          startDate?: string;
          endDate?: string;
        }>,
      });

      toast.success(
        `${productionUnitsToUpdate.length} unità produttive aggiornate con successo`
      );
      refetch();
    } catch (error) {
      console.error("Errore nell'aggiornamento bulk:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nell'aggiornamento delle unità produttive"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderDetails = (row: Record<string, unknown>): React.ReactNode => {
    const productionUnit = row.productionUnit as ProductionUnit;
    if (!productionUnit) {
      return <div>Dettagli non disponibili</div>;
    }

    const pu = productionUnit.productionUnit;
    const isEditing = editingId === pu.id;

    // Helper per convertire date ISO in formato YYYY-MM-DD per input
    const formatDateForInput = (dateStr: string | null) => {
      if (!dateStr) return "";
      return dateStr.split("T")[0];
    };

    return (
      <div className="p-4 space-y-4">
        {/* Header con pulsante edit */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {isEditing
              ? "Modifica Unità Produttiva"
              : "Dettagli Unità Produttiva"}
          </h3>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(productionUnit)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Modifica
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Nome Unità Produttiva */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Nome Unità Produttiva
            </Label>
            {isEditing ? (
              <Input
                value={editFormData.name || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.name}</p>
            )}
          </div>

          {/* Azienda - Non modificabile */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Azienda</Label>
            <p className="text-sm">{productionUnit.companyName}</p>
          </div>

          {/* Campi - Non modificabile */}
          <div className="col-span-2">
            <Label className="text-sm font-medium text-gray-500">Campi</Label>
            {productionUnit.fields && productionUnit.fields.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {productionUnit.fields.map((field) => (
                  <Badge
                    key={field.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleFieldClick(field)}
                  >
                    {field.name} ({field.areaHaOnField} Ha)
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm">-</p>
            )}
          </div>

          {/* Coltura */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Coltura</Label>
            {isEditing ? (
              <SearchableSelect
                value={editFormData.cropName ?? ""}
                options={cropCatalog?.getSpeciesOptions() ?? []}
                placeholder="Seleziona coltura"
                searchPlaceholder="Cerca coltura..."
                emptyMessage="Nessuna coltura trovata"
                noneOptionLabel="Nessuna selezione"
                loading={isCatalogLoading}
                loadingMessage="Caricamento varietà..."
                disabled={!cropCatalog}
                onChange={(selected) =>
                  handleEditCropSelection({ species: selected })
                }
                wrapperClassName="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.cropName}</p>
            )}
          </div>

          {/* Tipo Coltura */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Tipo Coltura
            </Label>
            {isEditing ? (
              <SearchableSelect
                value={editFormData.cropType ?? ""}
                options={cropCatalog?.getCropTypeOptions() ?? []}
                placeholder="Seleziona tipo coltura"
                searchPlaceholder="Cerca tipo coltura..."
                emptyMessage="Nessun tipo coltura trovato"
                noneOptionLabel="Nessuna selezione"
                loading={isCatalogLoading}
                loadingMessage="Caricamento varietà..."
                disabled={!cropCatalog}
                onChange={(selected) =>
                  handleEditCropSelection({ cropType: selected })
                }
                wrapperClassName="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.cropType}</p>
            )}
          </div>

          {/* Varietà */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Varietà</Label>
            {isEditing ? (
              <SearchableSelect
                value={editFormData.variety ?? ""}
                options={cropCatalog?.getVarietyOptions() ?? []}
                placeholder="Seleziona varietà"
                searchPlaceholder="Cerca varietà..."
                emptyMessage="Nessuna varietà trovata"
                noneOptionLabel="Nessuna selezione"
                loading={isCatalogLoading}
                loadingMessage="Caricamento varietà..."
                disabled={!cropCatalog}
                onChange={(selected) =>
                  handleEditCropSelection({ code: selected })
                }
                wrapperClassName="mt-1"
              />
            ) : (
              <p className="text-sm">
                {cropCatalog
                  ? cropCatalog.getVarietyLabel(pu.variety)
                  : pu.variety}
              </p>
            )}
          </div>

          {/* Protocollo */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Protocollo
            </Label>
            {isEditing ? (
              <Input
                value={editFormData.protocoll || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    protocoll: e.target.value,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.protocoll}</p>
            )}
          </div>

          {/* Area Totale */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Area Totale (Ha)
            </Label>
            {isEditing ? (
              <Input
                type="number"
                step="0.01"
                value={editFormData.areaHa || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    areaHa: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.areaHa}</p>
            )}
          </div>

          {/* Struttura Protezione */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Struttura Protezione
            </Label>
            {isEditing ? (
              <Input
                value={editFormData.protectionStructure || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    protectionStructure: e.target.value,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.protectionStructure}</p>
            )}
          </div>

          {/* Data Inizio */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Data Inizio
            </Label>
            {isEditing ? (
              <Input
                type="date"
                value={formatDateForInput(editFormData.startDate || "")}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    startDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">
                {pu.startDate
                  ? new Date(pu.startDate).toLocaleDateString("it-IT")
                  : "-"}
              </p>
            )}
          </div>

          {/* Data Fioritura */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Data Fioritura
            </Label>
            {isEditing ? (
              <Input
                type="date"
                value={formatDateForInput(editFormData.floweringDate || "")}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    floweringDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">
                {pu.floweringDate
                  ? new Date(pu.floweringDate).toLocaleDateString("it-IT")
                  : "-"}
              </p>
            )}
          </div>

          {/* Data Raccolta */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Data Raccolta
            </Label>
            {isEditing ? (
              <Input
                type="date"
                value={formatDateForInput(editFormData.harvestingDate || "")}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    harvestingDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">
                {pu.harvestingDate
                  ? new Date(pu.harvestingDate).toLocaleDateString("it-IT")
                  : "-"}
              </p>
            )}
          </div>

          {/* Data Fine */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Data Fine
            </Label>
            {isEditing ? (
              <Input
                type="date"
                value={formatDateForInput(editFormData.endDate || "")}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    endDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">
                {pu.endDate
                  ? new Date(pu.endDate).toLocaleDateString("it-IT")
                  : "-"}
              </p>
            )}
          </div>

          {/* Occupazione */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Occupazione
            </Label>
            {isEditing ? (
              <Input
                value={editFormData.occupazione || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    occupazione: e.target.value || null,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.occupazione || "-"}</p>
            )}
          </div>

          {/* Destinazione d'Uso */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Destinazione d'Uso
            </Label>
            {isEditing ? (
              <Input
                value={editFormData.destinazioneDiUso || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    destinazioneDiUso: e.target.value || null,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.destinazioneDiUso || "-"}</p>
            )}
          </div>

          {/* Acqua Totale Periodo */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Acqua Totale Periodo (L)
            </Label>
            {isEditing ? (
              <Input
                type="number"
                value={editFormData.acquaTotalePeridoL || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    acquaTotalePeridoL: parseInt(e.target.value) || null,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">
                {pu.acquaTotalePeridoL
                  ? pu.acquaTotalePeridoL.toLocaleString("it-IT")
                  : "-"}
              </p>
            )}
          </div>
        </div>

        {/* Pulsanti azioni */}
        <div className="mt-6 pt-4 border-t flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="default"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Salvataggio..." : "Salva"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Annulla
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setDeletingId(pu.id)}
              disabled={isDeleting}
            >
              Elimina Unità Produttiva
            </Button>
          )}
        </div>
      </div>
    );
  };

  const columns = useMemo(
    () => buildProductionUnitColumns(cropCatalog, companyDirectory),
    [cropCatalog, companyDirectory]
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Unità Produttive" />

      {/* Area scrollabile - solo la tabella */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Spinner size={20} ariaLabel="Caricamento dati" />
            <span>Caricamento dati…</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-gray-600 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium">
              Nessuna unità produttiva disponibile
            </p>
            <p className="text-xs mt-1 text-gray-500">
              Al momento non ci sono unità produttive da visualizzare
            </p>
          </div>
        ) : (
          <>
            <EditableTable
              columns={columns}
              rows={rows}
              isModify={true}
              addButton={false}
              getRowId={(row, index) =>
                (typeof row.id === "string" && row.id) || index
              }
              onSave={handleBulkSave}
              detailsRenderer={renderDetails}
              detailsTitle="Dettagli Unità Produttiva"
              className="bg-background"
            >
              <Button
                data-table-slot="right"
                variant="ghost"
                className="order-last gap-2 text-muted-foreground bg-agri-green-200 text-agri-green-700 cursor-pointer"
                asChild
              >
                <Link to="/new-production-unit">
                  <Plus className="w-4 h-4" />
                  Aggiungi
                </Link>
              </Button>
            </EditableTable>
            {productionUnits.length === 0 && (
              <div className="mt-4 text-center py-8 text-gray-600 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium">
                  Nessuna unità produttiva disponibile
                </p>
                <p className="text-xs mt-1 text-gray-500">
                  Al momento non ci sono unità produttive da visualizzare
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog di conferma eliminazione */}
      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa unità produttiva? Questa
              azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Drawer dettagli campo */}
      <Sheet open={isFieldDrawerOpen} onOpenChange={setIsFieldDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] bg-white p-2">
          <SheetHeader>
            <SheetTitle>Dettagli Campo</SheetTitle>
            <SheetDescription>
              Visualizza le informazioni del campo selezionato
            </SheetDescription>
          </SheetHeader>
          {selectedField && (
            <div className="mt-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Nome Campo
                </Label>
                <p className="text-sm mt-1">{selectedField.name}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Area SAU (Ha)
                </Label>
                <p className="text-sm mt-1">
                  {selectedField.sauHa.toLocaleString("it-IT", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Area GIS (Ha)
                </Label>
                <p className="text-sm mt-1">
                  {selectedField.gisHa !== null
                    ? selectedField.gisHa.toLocaleString("it-IT", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "-"}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Area Occupata dall'Unità Produttiva (Ha)
                </Label>
                <p className="text-sm mt-1">
                  {selectedField.areaHaOnField.toLocaleString("it-IT", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCloseFieldDrawer}
                  className="w-full"
                >
                  Chiudi
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
