import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { labelsApiService, type LabelSummary } from "@/api/labels";
import { Spinner } from "@/components/ui/spinner";
import { EditableTable, type EditableColumn } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { buildColumns, formatConfidence } from "@/utils/tableHelpers";
import { createTextSearch } from "@/utils/filter";
import { toast } from "sonner";

const buildLabelSummaryColumns = (): EditableColumn[] =>
  buildColumns<LabelSummary>([
    {
      id: "productName",
      title: "Nome commerciale",
      type: "text",
      width: "30%",
    },
    {
      id: "registrationNumber",
      title: "Numero di registrazione",
      type: "text",
      width: "30%",
    },
    {
      id: "extractionConfidence",
      title: "Qualità estrazione",
      type: "number",
      width: "10%",
      render: (value: unknown) =>
        formatConfidence(
          typeof value === "number" ? value : Number(value ?? 0)
        ),
    },
  ]);

export default function Label(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchFilter, setSearchFilter] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["labels", "summary"],
    queryFn: async () => labelsApiService.getSummary(),
  });

  // Mutation per l'eliminazione bulk
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await labelsApiService.bulkDelete(ids);
    },
    onSuccess: (response) => {
      // Invalida la query per ricaricare i dati
      queryClient.invalidateQueries({ queryKey: ["labels", "summary"] });

      // Mostra notifica di successo
      toast.success(
        `${response.deleted_count} etichet${
          response.deleted_count === 1 ? "ta eliminata" : "te eliminate"
        } con successo`
      );
    },
    onError: (error: Error) => {
      // Mostra notifica di errore
      toast.error(`Errore durante l'eliminazione: ${error.message}`);
    },
  });

  const columns = buildLabelSummaryColumns();

  const items: LabelSummary[] = useMemo(() => data?.data ?? [], [data]);

  // Crea il filtro di ricerca testuale (riutilizzabile)
  const textSearch = useMemo(
    () => createTextSearch<LabelSummary>(["productName", "registrationNumber"]),
    []
  );

  // Applica il filtro
  const filteredItems = useMemo(() => {
    return textSearch.setSearchTerm(searchFilter).filter(items);
  }, [items, searchFilter, textSearch]);

  // Handler per l'eliminazione di elementi selezionati
  const handleDeleteSelected = (
    removedRows: Array<Record<string, unknown>>
  ) => {
    const ids = removedRows.map((row) => String(row.id)).filter(Boolean);

    if (ids.length === 0) {
      toast.error("Nessun elemento selezionato per l'eliminazione");
      return;
    }

    // Conferma eliminazione
    const confirmMessage =
      ids.length === 1
        ? "Sei sicuro di voler eliminare questa etichetta?"
        : `Sei sicuro di voler eliminare ${ids.length} etichette?`;

    if (window.confirm(confirmMessage)) {
      deleteMutation.mutate(ids);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Etichette</h1>
        <Button onClick={() => navigate("/new-label")}>
          Aggiungi Etichette
        </Button>
      </div>

      {/* Filtro di ricerca */}
      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Cerca per nome prodotto o numero registrazione..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchFilter && (
          <p className="text-xs text-gray-500 mt-2">
            {filteredItems.length} risultat
            {filteredItems.length === 1 ? "o" : "i"} su {items.length}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size={20} ariaLabel="Caricamento etichette" />
          <span>Caricamento etichette…</span>
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">
          Impossibile caricare le etichette.
        </div>
      ) : filteredItems.length === 0 && searchFilter ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">
            Nessun risultato trovato per "<strong>{searchFilter}</strong>"
          </p>
          <p className="text-xs mt-1">
            Prova con un termine di ricerca diverso
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Nessuna etichetta disponibile</p>
        </div>
      ) : (
        <EditableTable
          columns={columns}
          rows={filteredItems}
          isModify={false}
          getRowId={(row, index) =>
            (typeof row.id === "string" && row.id) || index
          }
          onDeleteSelected={handleDeleteSelected}
          lastComponent={(row) => (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/label/${row.id}`)}
            >
              Apri
            </Button>
          )}
          className="bg-background"
        />
      )}
    </div>
  );
}
