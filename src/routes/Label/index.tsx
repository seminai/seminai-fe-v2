import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { labelsApiService, type LabelSummary } from "@/api/labels";
import { Spinner } from "@/components/ui/spinner";
import { EditableTable, type EditableColumn } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  buildColumns,
  formatConfidence,
  formatQuality,
  formatErrors,
} from "@/utils/tableHelpers";

const buildLabelSummaryColumns = (): EditableColumn[] =>
  buildColumns<LabelSummary>([
    { id: "productName", title: "Product", type: "text", width: "28%" },
    {
      id: "registrationNumber",
      title: "Registration No.",
      type: "text",
      width: "20%",
    },
    {
      id: "extractionConfidence",
      title: "Confidence",
      type: "number",
      width: "14%",
      render: (value: unknown) =>
        formatConfidence(
          typeof value === "number" ? value : Number(value ?? 0)
        ),
    },
    {
      id: "qualityExtraction",
      title: "Quality",
      type: "text",
      width: "24%",
      render: (value: unknown) =>
        formatQuality(Array.isArray(value) ? (value as number[]) : []),
    },
    {
      id: "errors",
      title: "Errors",
      type: "text",
      width: "14%",
      render: (value: unknown) =>
        formatErrors(Array.isArray(value) ? (value as unknown[]) : []),
    },
  ]);

const toRow = (item: LabelSummary): Record<string, unknown> => ({
  id: item.id,
  productName: item.productName,
  registrationNumber: item.registrationNumber,
  extractionConfidence: item.extractionConfidence,
  qualityExtraction: item.qualityExtraction,
  errors: item.errors,
});

export default function Label(): React.ReactElement {
  const navigate = useNavigate();
  const [searchFilter, setSearchFilter] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["labels", "summary"],
    queryFn: async () => labelsApiService.getSummary(),
  });

  const columns = buildLabelSummaryColumns();
  const items: LabelSummary[] = data?.data ?? [];

  // Filtra gli items in base al termine di ricerca
  const filteredItems = items.filter((item) => {
    if (!searchFilter.trim()) return true;

    const searchLower = searchFilter.toLowerCase();
    const productNameMatch = item.productName
      .toLowerCase()
      .includes(searchLower);
    const registrationNumberMatch = item.registrationNumber
      .toLowerCase()
      .includes(searchLower);

    return productNameMatch || registrationNumberMatch;
  });

  const rows = filteredItems.map(toRow);

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
          rows={rows}
          isModify={false}
          getRowId={(row, index) =>
            (typeof row.id === "string" && row.id) || index
          }
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
