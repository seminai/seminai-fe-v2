import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { labelsApiService, type LabelSummary } from "@/api/labels";
import { Spinner } from "@/components/ui/spinner";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { buildColumns, formatConfidence } from "@/utils/tableHelpers";
import { createTextSearch } from "@/utils/filter";
import { toast } from "sonner";
import { PageHeader } from "@/components/organism/Header";

const buildLabelSummaryColumns = (): EditableColumn[] =>
  buildColumns<LabelSummary>([
    {
      id: "productName",
      title: "Nome commerciale",
      type: "text",
      width: "25%",
    },
    {
      id: "registrationNumber",
      title: "Numero di registrazione",
      type: "text",
      width: "20%",
    },
    {
      id: "isVerified",
      title: "Verificata",
      type: "text",
      width: "10%",
      render: (value: unknown) => {
        const isVerified = Boolean(value);
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isVerified
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
            }`}
          >
            {isVerified ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                Verificata
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                Non verificata
              </>
            )}
          </span>
        );
      },
    },
    {
      id: "createdAt",
      title: "Data creazione",
      type: "text",
      width: "15%",
      render: (value: unknown) => {
        if (!value) return "-";
        const date = new Date(value as string);
        return new Intl.DateTimeFormat("it-IT", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(date);
      },
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
    <div className="flex flex-col h-full">
      <PageHeader
        title="Etichette"
        searchPlaceholder="Cerca per nome prodotto o numero registrazione..."
        searchValue={searchFilter}
        onSearchChange={setSearchFilter}
        totalItems={items.length}
        filteredItems={filteredItems.length}
        rightElement={
          <Button
            onClick={() => navigate("/new-label")}
            className="whitespace-nowrap"
          >
            Aggiungi Etichette
          </Button>
        }
      />

      {/* Area scrollabile - solo la tabella */}
      <div className="flex-1 overflow-auto px-6 pb-6">
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
            onOpenDetails={(row) => navigate(`/label/${row.id}`)}
            className="bg-background"
          />
        )}
      </div>
    </div>
  );
}
