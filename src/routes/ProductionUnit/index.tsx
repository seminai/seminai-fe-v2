import * as React from "react";
import { useState, useMemo } from "react";
import {
  type ProductionUnit,
  type ProductionUnitUpdateInput,
} from "@/api/production-unit";
import { Spinner } from "@/components/ui/spinner";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { createTextSearch } from "@/utils/filter";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import { PageHeader } from "@/components/organism/Header";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const buildProductionUnitColumns = (): EditableColumn[] => {
  return [
    {
      id: "companyName",
      title: "Azienda",
      type: "text",
    },
    {
      id: "name",
      title: "Nome Unità Produttiva",
      type: "text",
    },
    {
      id: "cropName",
      title: "Coltura",
      type: "text",
    },
    {
      id: "cropType",
      title: "Tipo Coltura",
      type: "text",
    },
    {
      id: "variety",
      title: "Varietà",
      type: "text",
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
      id: "fieldName",
      title: "Campo",
      type: "text",
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
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<ProductionUnitUpdateInput>(
    {}
  );
  const [isSaving, setIsSaving] = useState(false);

  const { productionUnits, isLoading, error, refetch } = useProductionUnit();

  // Converti i dati delle unità produttive in formato row per la tabella
  const rows = useMemo(() => {
    return productionUnits.map((pu) => ({
      id: pu.productionUnit.id,
      companyName: pu.companyName,
      name: pu.productionUnit.name,
      cropName: pu.productionUnit.cropName,
      cropType: pu.productionUnit.cropType,
      variety: pu.productionUnit.variety,
      protocoll: pu.productionUnit.protocoll,
      areaHa: pu.productionUnit.areaHa,
      protectionStructure: pu.productionUnit.protectionStructure,
      fieldName: pu.field?.name || "-",
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

  const textSearch = useMemo(
    () =>
      createTextSearch<(typeof rows)[0]>([
        "name",
        "companyName",
        "cropName",
        "cropType",
        "variety",
        "fieldName",
      ]),
    []
  );

  const filteredItems = useMemo(() => {
    return textSearch.setSearchTerm(searchFilter).filter(rows);
  }, [rows, searchFilter, textSearch]);

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

          {/* Campo - Non modificabile */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Campo</Label>
            <p className="text-sm">{productionUnit.field?.name || "-"}</p>
          </div>

          {/* Area sul Campo - Non modificabile */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Area sul Campo (Ha)
            </Label>
            <p className="text-sm">{productionUnit.areaHaOnField ?? "-"}</p>
          </div>

          {/* Coltura */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Coltura</Label>
            {isEditing ? (
              <Input
                value={editFormData.cropName || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, cropName: e.target.value })
                }
                className="mt-1"
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
              <Input
                value={editFormData.cropType || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, cropType: e.target.value })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.cropType}</p>
            )}
          </div>

          {/* Varietà */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Varietà</Label>
            {isEditing ? (
              <Input
                value={editFormData.variety || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, variety: e.target.value })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.variety}</p>
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

  const columns = buildProductionUnitColumns();

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Unità Produttive"
        searchPlaceholder="Cerca per nome, azienda, coltura, varietà o campo..."
        searchValue={searchFilter}
        onSearchChange={setSearchFilter}
        totalItems={productionUnits.length}
        filteredItems={filteredItems.length}
        rightElement={
          <Button variant="outline" asChild>
            <Link to="/new-production-unit">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi unità produttiva
            </Link>
          </Button>
        }
      />

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
        ) : productionUnits.length === 0 ? (
          <div className="text-center py-8 text-gray-600 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium">
              Nessuna unità produttiva disponibile
            </p>
            <p className="text-xs mt-1 text-gray-500">
              Al momento non ci sono unità produttive da visualizzare
            </p>
          </div>
        ) : (
          <EditableTable
            columns={columns}
            rows={filteredItems}
            isModify={true}
            addButton={false}
            getRowId={(row, index) =>
              (typeof row.id === "string" && row.id) || index
            }
            detailsRenderer={renderDetails}
            detailsTitle="Dettagli Unità Produttiva"
            className="bg-background"
          />
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
    </div>
  );
}
