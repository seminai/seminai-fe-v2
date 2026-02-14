import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/organism/Header";
import { type EditableColumn } from "@/components/organism/EditableTable";
import { toast } from "sonner";
import { fieldNotesApiService } from "@/api/field-notes";
import { FieldNoteCategory, FieldNoteStatus } from "@/api/field-notes";
import type { FieldNote, FieldNoteRowData } from "./types";
import FieldNotesView from "./FieldNotesView";
import { CreateFieldNoteDrawer } from "./CreateFieldNoteDrawer";
import { FieldNoteDetailsDrawer } from "./FieldNoteDetailsDrawer";
import { useFields } from "@/hooks/useFields";
import { useProducts } from "@/hooks/useProducts";
import { useCompanies } from "@/hooks/useCompanies";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { useUserId } from "@/contexts/UserIdContext";
import { getScopedStorageItem, setScopedStorageItem } from "@/utils/storageKeys";

const FIELD_NOTES_RIGHT_SIDEBAR_WIDTH_KEY = "fieldNotesRightSidebarWidth";

export default function FieldNotesPage() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  // State per sidebar
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);

  // State per drawer custom
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [selectedFieldNoteForDetails, setSelectedFieldNoteForDetails] =
    useState<FieldNote | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);

  // Query per caricare field notes
  const {
    data: fieldNotesData,
    isLoading,
    error,
  } = useQuery<FieldNote[], Error>({
    queryKey: ["field-notes"],
    queryFn: () => fieldNotesApiService.getFieldNotes(),
  });

  const fieldNotes = useMemo(() => fieldNotesData || [], [fieldNotesData]);

  // Query per campi, prodotti, aziende e unità produttive
  const { fields = [] } = useFields();
  const { products = [] } = useProducts();
  const { companies = [] } = useCompanies();
  const { productionUnits = [] } = useProductionUnit();

  // Configurazione colonne tabella
  const columns: EditableColumn[] = useMemo(() => {
    // Prepara le opzioni prodotti
    const productsOptions = Array.isArray(products)
      ? products.map((p: { id: string; name: string }) => ({
          label: p.name,
          value: p.id,
        }))
      : [];

    return [
      {
        id: "companyName",
        title: "Azienda",
        type: "text",
        readOnly: true,
        width: "180px",
        render: (value) => {
          if (!value || value === "" || value === null || value === undefined) {
            return <span className="text-slate-400">-</span>;
          }
          return <span className="font-medium">{String(value)}</span>;
        },
      },
      {
        id: "category",
        title: "Categoria",
        type: "select",
        required: true,
        width: "150px",
        options: [
          { label: "Operazione", value: FieldNoteCategory.OPERATION },
          { label: "Osservazione", value: FieldNoteCategory.OBSERVATION },
          { label: "Misurazione", value: FieldNoteCategory.MEASUREMENT },
          { label: "Raccolta", value: FieldNoteCategory.HARVEST },
          { label: "Manutenzione", value: FieldNoteCategory.MAINTENANCE },
          { label: "Altro", value: FieldNoteCategory.OTHER },
        ],
      },
      {
        id: "status",
        title: "Stato",
        type: "select",
        width: "150px",
        options: [
          { label: "In Attesa", value: FieldNoteStatus.PENDING },
          { label: "Elaborazione", value: FieldNoteStatus.PROCESSING },
          { label: "Processata", value: FieldNoteStatus.PROCESSED },
          { label: "Fallita", value: FieldNoteStatus.FAILED },
          { label: "Revisionata", value: FieldNoteStatus.MANUALLY_REVIEWED },
        ],
        render: (value) => {
          const statusConfig: Record<
            string,
            { label: string; className: string }
          > = {
            [FieldNoteStatus.PENDING]: {
              label: "In Attesa",
              className: "bg-slate-100 text-slate-700",
            },
            [FieldNoteStatus.PROCESSING]: {
              label: "Elaborazione",
              className: "bg-blue-100 text-blue-700",
            },
            [FieldNoteStatus.PROCESSED]: {
              label: "Processata",
              className: "bg-emerald-100 text-emerald-700",
            },
            [FieldNoteStatus.FAILED]: {
              label: "Fallita",
              className: "bg-red-100 text-red-700",
            },
            [FieldNoteStatus.MANUALLY_REVIEWED]: {
              label: "Revisionata",
              className: "bg-amber-100 text-amber-700",
            },
          };
          const config = statusConfig[value as string] || {
            label: String(value),
            className: "",
          };
          return <Badge className={config.className}>{config.label}</Badge>;
        },
      },
      {
        id: "rawContent",
        title: "Contenuto",
        type: "text",
        required: true,
        width: "300px",
        placeholder: "Descrizione della nota...",
      },
      {
        id: "extractedOperation",
        title: "Operazione Estratta",
        type: "text",
        readOnly: true,
        width: "180px",
        render: (value) => {
          if (!value || value === "" || value === null || value === undefined) {
            return <span className="text-slate-400">-</span>;
          }
          return <span className="font-medium">{String(value)}</span>;
        },
      },
      {
        id: "extractedFields",
        title: "Campi Riconosciuti",
        type: "text",
        readOnly: true,
        width: "150px",
        render: (value) => {
          if (!value || !Array.isArray(value) || value.length === 0) {
            return <span className="text-slate-400">-</span>;
          }
          return (
            <Badge variant="outline" className="text-xs">
              {value.length} {value.length === 1 ? "campo" : "campi"}
            </Badge>
          );
        },
      },
      {
        id: "extractedProducts",
        title: "Prodotti Riconosciuti",
        type: "text",
        readOnly: true,
        width: "250px",
        render: (value) => {
          if (!value || !Array.isArray(value) || value.length === 0) {
            return <span className="text-slate-400">-</span>;
          }
          return (
            <div className="flex flex-col gap-1">
              {value.map(
                (
                  product: { name?: string; quantity?: number; unit?: string },
                  idx: number
                ) => {
                  const quantity =
                    product.quantity != null ? product.quantity : "";
                  const unit = product.unit || "";
                  const displayText =
                    quantity && unit
                      ? `${product.name || "-"} - ${quantity} ${unit}`
                      : product.name || "-";
                  return (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs w-fit"
                    >
                      {displayText}
                    </Badge>
                  );
                }
              )}
            </div>
          );
        },
      },

      {
        id: "productionUnitName",
        title: "Unità Produttiva",
        type: "text",
        readOnly: true,
        width: "200px",
        render: (value) => {
          if (!value || value === "" || value === null || value === undefined) {
            return <span className="text-slate-400">-</span>;
          }
          return <span className="font-medium">{String(value)}</span>;
        },
      },

      {
        id: "operationDate",
        title: "Data Operazione",
        type: "date",
        width: "150px",
      },
      {
        id: "fieldCount",
        title: "Campo",
        type: "text",
        readOnly: true,
        width: "100px",
        render: (value) => {
          if (value == null || value === 0) {
            return <span className="text-slate-400">-</span>;
          }
          const count = Number(value);
          return (
            <Badge variant="outline" className="text-xs">
              {count} {count === 1 ? "campo" : "campi"}
            </Badge>
          );
        },
      },
      {
        id: "productName",
        title: "Prodotto",
        type: "select",
        width: "180px",
        enableSearch: true,
        searchPlaceholder: "Cerca prodotto...",
        options: productsOptions,
      },
      {
        id: "aiConfidenceScore",
        title: "Confidence AI",
        type: "number",
        readOnly: true,
        width: "120px",
        render: (value) => {
          if (value == null) return "-";
          const score = Number(value);
          const percentage = Math.round(score * 100);
          const color =
            score >= 0.8
              ? "text-emerald-600"
              : score >= 0.5
              ? "text-amber-600"
              : "text-red-600";
          return <span className={color}>{percentage}%</span>;
        },
      },
      {
        id: "latitude",
        title: "Latitudine",
        type: "number",
        readOnly: true,
        width: "0px", // Hidden
      },
      {
        id: "longitude",
        title: "Longitudine",
        type: "number",
        readOnly: true,
        width: "0px", // Hidden
      },
      {
        id: "gpsLocation",
        title: "GPS",
        type: "text",
        readOnly: true,
        width: "100px",
        render: (_, row) => {
          const lat = row.latitude as number | null;
          const lng = row.longitude as number | null;
          if (lat != null && lng != null) {
            return (
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <MapPin className="h-3 w-3" />
                <span>Sì</span>
              </div>
            );
          }
          return <span className="text-slate-400">-</span>;
        },
      },
      {
        id: "attachmentsCount",
        title: "Allegati",
        type: "number",
        readOnly: true,
        width: "90px",
        render: (value) => {
          const count = Number(value) || 0;
          if (count === 0) return <span className="text-slate-400">-</span>;
          return <Badge variant="outline">{count}</Badge>;
        },
      },
      {
        id: "notes",
        title: "Note",
        type: "text",
        width: "200px",
        placeholder: "Note aggiuntive...",
      },
      {
        id: "createdAt",
        title: "Data Creazione",
        type: "date",
        readOnly: true,
        width: "150px",
      },
    ];
  }, [products, companies, productionUnits]);

  // Converti field notes in row data per EditableTable
  const rows: FieldNoteRowData[] = useMemo(() => {
    if (!Array.isArray(fieldNotes)) {
      return [];
    }

    return fieldNotes.map((note) => {
      // Estrai nome azienda dai dati annidati (priorità: company.name a livello root)
      let companyName: string | null = null;
      if (note.company?.name) {
        companyName = String(note.company.name);
      } else if (note.field && !Array.isArray(note.field)) {
        const fieldObj = note.field as {
          id: string;
          name: string;
          companyId: string;
          company?: { id: string; name: string };
        };
        if (fieldObj.company?.name) {
          companyName = String(fieldObj.company.name);
        }
      } else if (note.productionUnit?.company?.name) {
        companyName = String(note.productionUnit.company.name);
      } else if (note.product?.company?.name) {
        companyName = String(note.product.company.name);
      }

      // Estrai nome unità produttiva dai dati annidati
      let productionUnitName: string | null = null;
      if (note.productionUnit?.name) {
        productionUnitName = String(note.productionUnit.name);
      } else if (note.productionUnitName) {
        productionUnitName = String(note.productionUnitName);
      }

      // Conta il numero di campi (gestisce sia oggetto singolo che array)
      let fieldCount: number = 0;
      if (Array.isArray(note.field)) {
        fieldCount = note.field.length;
      } else if (note.field && !Array.isArray(note.field)) {
        fieldCount = 1;
      } else if (note.fieldId) {
        fieldCount = 1;
      }

      // Estrai nome prodotto dai dati annidati
      const productName = note.productName || note.product?.name || null;

      // Estrai dati da extractedData
      const extractedOperation = note.extractedData?.operation || null;
      const extractedFields = note.extractedData?.recognizedFields || null;
      const extractedProducts = note.extractedData?.recognizedProducts || null;

      return {
        id: note.id,
        category: note.category,
        rawContent: note.rawContent,
        status: note.status,
        operationDate: note.operationDate,
        extractedOperation,
        extractedFields,
        extractedProducts,
        companyName,
        productionUnitName,
        fieldId: note.fieldId || null,
        fieldCount,
        productionUnitId: note.productionUnitId || null,
        productId: note.productId || null,
        productName,
        aiConfidenceScore: note.aiConfidenceScore,
        latitude: note.latitude,
        longitude: note.longitude,
        attachmentsCount: note.attachments?.length || 0,
        notes: note.notes,
        createdAt: note.createdAt,
      };
    });
  }, [fieldNotes]);

  // Handle save from custom drawer
  const handleCreateFromDrawer = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        // Crea la field note
        const fieldNote = await fieldNotesApiService.createFieldNote({
          category: data.category as FieldNoteCategory,
          rawContent: data.rawContent as string,
          operationDate: data.operationDate as string | undefined,
          latitude: data.latitude as number | undefined,
          longitude: data.longitude as number | undefined,
        });

        // Se c'è productionUnitId, productId o notes, aggiorna la field note
        if (data.productionUnitId || data.productId || data.notes) {
          await fieldNotesApiService.updateFieldNote(fieldNote.id, {
            productionUnitId: data.productionUnitId as string | undefined,
            productId: data.productId as string | undefined,
            notes: data.notes as string | undefined,
          });
        }

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["field-notes"] });
        toast.success("Nota di campo creata con successo");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";
        toast.error("Errore durante la creazione", {
          description: errorMessage,
        });
        throw error;
      }
    },
    [queryClient]
  );

  // Handle save (create & update) - per modifiche inline
  const handleSave = useCallback(
    async (payload: {
      created: Array<Record<string, unknown>>;
      updated: Array<Record<string, unknown>>;
    }) => {
      try {
        // Create new field notes (non dovrebbe essere usato se usiamo la drawer custom)
        for (const row of payload.created) {
          await fieldNotesApiService.createFieldNote({
            category: row.category as FieldNoteCategory,
            rawContent: row.rawContent as string,
            operationDate: row.operationDate as string | undefined,
          });
        }

        // Update existing field notes
        for (const row of payload.updated) {
          await fieldNotesApiService.updateFieldNote(row.id as string, {
            category: row.category as FieldNoteCategory | undefined,
            rawContent: row.rawContent as string | undefined,
            status: row.status as FieldNoteStatus | undefined,
            fieldId: row.fieldId as string | undefined,
            productId: row.productId as string | undefined,
            notes: row.notes as string | undefined,
          });
        }

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["field-notes"] });

        const totalChanges = payload.created.length + payload.updated.length;
        toast.success(`${totalChanges} modifiche salvate con successo`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";
        toast.error("Errore durante il salvataggio", {
          description: errorMessage,
        });
        throw error;
      }
    },
    [queryClient]
  );

  // Handle delete
  const handleDeleteSelected = useCallback(
    async (removed: Array<Record<string, unknown>>) => {
      try {
        for (const row of removed) {
          await fieldNotesApiService.deleteFieldNote(row.id as string);
        }

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["field-notes"] });

        toast.success(`${removed.length} nota/e eliminata/e con successo`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";
        toast.error("Errore durante l'eliminazione", {
          description: errorMessage,
        });
        throw error;
      }
    },
    [queryClient]
  );

  // Handle resize pannello laterale
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startX = e.clientX;
      const startWidth = rightSidebarWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX;
        const newWidth = Math.max(300, Math.min(800, startWidth + delta));
        setRightSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        // Salva width in localStorage
        setScopedStorageItem(
          FIELD_NOTES_RIGHT_SIDEBAR_WIDTH_KEY,
          userId,
          String(rightSidebarWidth)
        );
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [rightSidebarWidth, userId]
  );

  // Callback quando una field note viene salvata dalla chat
  const handleFieldNoteSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["field-notes"] });
  }, [queryClient]);

  // Handler per aprire il drawer dei dettagli
  const handleOpenDetails = useCallback(
    (rowData: Record<string, unknown>) => {
      const fieldNoteId = rowData.id as string;
      const fieldNote = fieldNotes.find((fn) => fn.id === fieldNoteId);
      if (fieldNote) {
        setSelectedFieldNoteForDetails(fieldNote);
        setIsDetailsDrawerOpen(true);
      }
    },
    [fieldNotes]
  );

  // Handler per salvare le modifiche dal drawer dei dettagli
  const handleUpdateFieldNote = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      try {
        await fieldNotesApiService.updateFieldNote(id, {
          category: data.category as FieldNoteCategory | undefined,
          rawContent: data.rawContent as string | undefined,
          status: data.status as FieldNoteStatus | undefined,
          fieldId: data.fieldId as string | null | undefined,
          productionUnitId: data.productionUnitId as string | null | undefined,
          productId: data.productId as string | null | undefined,
          notes: data.notes as string | undefined,
          latitude: data.latitude as number | undefined,
          longitude: data.longitude as number | undefined,
          operationDate: data.operationDate as string | undefined,
        });

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["field-notes"] });
        toast.success("Nota di campo aggiornata con successo");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";
        toast.error("Errore durante l'aggiornamento", {
          description: errorMessage,
        });
        throw error;
      }
    },
    [queryClient]
  );

  // Handler per verificare le field notes selezionate (bulk verify)
  const handleBulkVerifySelected = useCallback(
    async (selectedRows: Array<Record<string, unknown>>) => {
      if (selectedRows.length === 0 || isBulkVerifying) {
        return;
      }

      setIsBulkVerifying(true);

      try {
        // Aggiorna tutte le field notes selezionate impostando lo status a MANUALLY_REVIEWED
        await Promise.all(
          selectedRows.map((row) =>
            fieldNotesApiService.updateFieldNote(row.id as string, {
              status: FieldNoteStatus.MANUALLY_REVIEWED,
            })
          )
        );

        const verifiedCount = selectedRows.length;
        toast.success("Note di campo verificate", {
          description: `${verifiedCount} ${
            verifiedCount === 1 ? "nota verificata" : "note verificate"
          } con successo`,
        });

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["field-notes"] });
      } catch (error) {
        toast.error("Errore durante la verifica", {
          description:
            error instanceof Error ? error.message : "Riprova più tardi",
        });
        console.error("Error verifying field notes:", error);
      } finally {
        setIsBulkVerifying(false);
      }
    },
    [isBulkVerifying, queryClient]
  );

  // Load sidebar width from localStorage
  useEffect(() => {
    try {
      const savedWidth = getScopedStorageItem(
        FIELD_NOTES_RIGHT_SIDEBAR_WIDTH_KEY,
        userId
      );
      if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        if (!isNaN(width)) {
          setRightSidebarWidth(width);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [userId]);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-[calc(100svh-56px-96px)] md:h-svh overflow-hidden">
      <PageHeader
        title="Note di Campo"
        className="hidden md:block"
      ></PageHeader>

      <FieldNotesView
        error={error}
        isLoading={isLoading}
        fieldNotesLength={fieldNotes.length}
        columns={columns}
        rows={rows}
        onSave={handleSave}
        onDeleteSelected={handleDeleteSelected}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={setIsRightSidebarOpen}
        rightSidebarWidth={rightSidebarWidth}
        onResizeStart={handleResizeStart}
        isResizing={isResizing}
        showAddButton={true}
        onAddClick={() => setIsCreateDrawerOpen(true)}
        newRowDefaults={{
          category: FieldNoteCategory.OPERATION,
          status: FieldNoteStatus.PENDING,
          operationDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }}
        onFieldNoteSaved={handleFieldNoteSaved}
        onOpenDetails={handleOpenDetails}
        onBulkVerifySelected={handleBulkVerifySelected}
        isBulkVerifying={isBulkVerifying}
      />

      <CreateFieldNoteDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        companies={companies}
        productionUnits={productionUnits}
        fields={Array.isArray(fields) ? fields : []}
        products={Array.isArray(products) ? products : []}
        onSave={handleCreateFromDrawer}
      />

      <FieldNoteDetailsDrawer
        open={isDetailsDrawerOpen}
        onOpenChange={setIsDetailsDrawerOpen}
        fieldNote={selectedFieldNoteForDetails}
        companies={companies}
        productionUnits={productionUnits}
        fields={Array.isArray(fields) ? fields : []}
        products={Array.isArray(products) ? products : []}
        onSave={handleUpdateFieldNote}
      />
    </div>
  );
}
