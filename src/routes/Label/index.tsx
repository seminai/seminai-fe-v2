import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { labelsApiService, type LabelSummary } from "@/api/labels";
import { Spinner } from "@/components/ui/spinner";
import { EditableTable, type EditableColumn } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["labels", "summary"],
    queryFn: async () => labelsApiService.getSummary(),
  });

  const columns = buildLabelSummaryColumns();
  const items: LabelSummary[] = data?.data ?? [];
  const rows = items.map(toRow);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Etichette</h1>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size={20} ariaLabel="Caricamento etichette" />
          <span>Caricamento etichette…</span>
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">
          Impossibile caricare le etichette.
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
