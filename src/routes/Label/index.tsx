import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { labelsApiService, type LabelSummary } from "@/api/labels";
import { Spinner } from "@/components/ui/spinner";
import { EditableTable, type EditableColumn } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

class LabelsTableViewModel {
  readonly title: string;

  constructor() {
    this.title = "Etichette";
  }

  public formatConfidence(value: number): string {
    if (value <= 1) return `${Math.round(value * 100)}%`;
    return `${Math.round(value)}%`;
  }

  public formatQuality(values: number[]): string {
    if (!Array.isArray(values) || values.length === 0) return "-";
    return values.map((v) => v.toFixed(2)).join(" · ");
  }

  public buildColumns(): EditableColumn[] {
    return [
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
          this.formatConfidence(
            typeof value === "number" ? value : Number(value ?? 0)
          ),
      },
      {
        id: "qualityExtraction",
        title: "Quality",
        type: "text",
        width: "24%",
        render: (value: unknown) =>
          this.formatQuality(Array.isArray(value) ? (value as number[]) : []),
      },
      {
        id: "errors",
        title: "Errors",
        type: "text",
        width: "14%",
        render: (value: unknown) => {
          const errs = Array.isArray(value) ? (value as unknown[]) : [];
          return errs.length === 0 ? "None" : String(errs.length);
        },
      },
    ];
  }

  public toRow(item: LabelSummary): Record<string, unknown> {
    return {
      id: item.id,
      productName: item.productName,
      registrationNumber: item.registrationNumber,
      extractionConfidence: item.extractionConfidence,
      qualityExtraction: item.qualityExtraction,
      errors: item.errors,
    };
  }
}

export default function Label(): React.ReactElement {
  const [viewModel] = React.useState<LabelsTableViewModel>(
    () => new LabelsTableViewModel()
  );
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["labels", "summary"],
    queryFn: async () => labelsApiService.getSummary(),
  });

  const columns = viewModel.buildColumns();
  const items: LabelSummary[] = data?.data ?? [];
  const rows = items.map((i) => viewModel.toRow(i));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">{viewModel.title}</h1>

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
