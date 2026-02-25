import { useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Warehouse, FileSpreadsheet, FileText, StickyNote } from "lucide-react";
import { ImportProducts } from "@/routes/DosageManager/importProducts";
import { ImportProductsFromDdt } from "@/routes/DosageManager/importProductsFromDdt";

interface ImportToolbarProps {
  onImportFromWarehouse: () => void;
  onImportFromNotes: () => void;
  onAddRowsFromCsv: (rows: Array<Record<string, unknown>>) => void;
  onAddRowsFromDdt: (rows: Array<Record<string, unknown>>) => void;
  isImportingFromWarehouse: boolean;
  isImportingFromNotes: boolean;
  isLoadingWarehouse: boolean;
}

export function ImportToolbar({
  onImportFromWarehouse,
  onImportFromNotes,
  onAddRowsFromCsv,
  onAddRowsFromDdt,
  isImportingFromWarehouse,
  isImportingFromNotes,
  isLoadingWarehouse,
}: ImportToolbarProps): ReactElement {
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showDdtImport, setShowDdtImport] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onImportFromWarehouse}
        disabled={isImportingFromWarehouse || isLoadingWarehouse}
        className="gap-2"
      >
        {isImportingFromWarehouse ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Warehouse className="h-4 w-4" />
        )}
        Importa da Magazzino
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCsvImport(true)}
        className="gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Importa da CSV
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDdtImport(true)}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Importa da DDT
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onImportFromNotes}
        disabled={isImportingFromNotes}
        className="gap-2"
      >
        {isImportingFromNotes ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <StickyNote className="h-4 w-4" />
        )}
        Importa da Note
      </Button>

      {showCsvImport && (
        <ImportProducts
          onAddRows={(rows) => {
            onAddRowsFromCsv(rows);
            setShowCsvImport(false);
          }}
        />
      )}

      {showDdtImport && (
        <ImportProductsFromDdt
          onAddRows={(rows) => {
            onAddRowsFromDdt(rows);
            setShowDdtImport(false);
          }}
        />
      )}
    </div>
  );
}
