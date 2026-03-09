import * as React from "react";
import { useCallback, useState } from "react";
import { type BulkFieldInput } from "@/api/fields";
import { type Company } from "@/api/companies";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ImportFieldByCsvContent } from "./ImportFieldByCsvContent";
import { useFieldExtraction } from "./useFieldExtraction";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface ImportFieldByCsvProps {
  companies: Company[];
  onImportSuccess: (fields: BulkFieldInput[]) => void;
  onCloseParentDrawer?: () => void;
  embedded?: boolean;
  slot?: string;
}

export function ImportFieldByCsv({
  companies,
  onImportSuccess,
  onCloseParentDrawer,
  embedded = false,
}: ImportFieldByCsvProps): React.ReactElement {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [showSupportForm, setShowSupportForm] = useState(false);

  const handleDone = useCallback(() => {
    setSelectedCompanyId("");
    setShowSupportForm(false);
    if (embedded) {
      onCloseParentDrawer?.();
    } else {
      setIsDrawerOpen(false);
      onCloseParentDrawer?.();
    }
  }, [embedded, onCloseParentDrawer]);

  const { state, startExtraction, cancel } = useFieldExtraction({
    onSuccess: onImportSuccess,
    onDone: handleDone,
  });

  const handleFileSelect = useCallback(
    (files: File[]) => {
      startExtraction(files, selectedCompanyId);
    },
    [selectedCompanyId, startExtraction],
  );

  const handleDrawerOpenChange = (open: boolean): void => {
    setIsDrawerOpen(open);
    if (!open) {
      setSelectedCompanyId("");
      setShowSupportForm(false);
    }
  };

  const handleDownloadTemplate = (): void => {
    const link = document.createElement("a");
    link.href = "/templates/2026.01_Template_field_piemonte.xlsx";
    link.download = "2026.01_Template_field_piemonte.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSupportRequestSuccess = (): void => {
    setShowSupportForm(false);
    toast.success("Richiesta inviata. Ti risponderemo al più presto.");
  };

  const importContent = (
    <ImportFieldByCsvContent
      companies={companies}
      selectedCompanyId={selectedCompanyId}
      onCompanyChange={setSelectedCompanyId}
      onFileSelect={handleFileSelect}
      isProcessing={state.isProcessing}
      onCancelProcessing={cancel}
      processingProgress={state.progress}
      processingMessage={state.message}
      processingElapsedMs={state.elapsedMs}
      importErrors={state.errors}
      importWarnings={state.warnings}
      showSupportForm={showSupportForm}
      onToggleSupportForm={() => setShowSupportForm(!showSupportForm)}
      onDownloadTemplate={handleDownloadTemplate}
      onSupportRequestSuccess={handleSupportRequestSuccess}
    />
  );

  if (embedded) {
    return importContent;
  }

  return (
    <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
      <DrawerTrigger asChild>
        <Button variant="default" className="gap-2">
          <Upload className="h-4 w-4" />
          Importa file
        </Button>
      </DrawerTrigger>
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="!w-1/2 !max-w-[50vw] h-full overflow-y-auto overflow-x-hidden bg-white p-2"
      >
        <DrawerHeader>
          <DrawerTitle>Estrazione Automatica Campi </DrawerTitle>
          <DrawerDescription>
            Supporta il template AGEA (CSV, XLS, XLSX, PDF) e Shapefile
            (.shp + .dbf + .shx) o ZIP con coordinate geografiche. Seleziona
            l&apos;azienda e carica un file; i dati dei campi verranno estratti
            automaticamente.
          </DrawerDescription>
        </DrawerHeader>
        {importContent}
      </DrawerContent>
    </Drawer>
  );
}
