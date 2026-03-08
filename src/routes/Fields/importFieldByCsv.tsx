import * as React from "react";
import { useState } from "react";
import { type BulkFieldInput, fieldsApiService } from "@/api/fields";
import { filesApiService } from "@/api/files";
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
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface ImportFieldByCsvProps {
  companies: Company[];
  onImportSuccess: (fields: BulkFieldInput[]) => void;
  onCloseParentDrawer?: () => void;
  /** When true, render only the form content (no Drawer/Trigger); for use inside create drawer */
  embedded?: boolean;
  slot?: string;
}

/**
 * ImportFieldByCsv - Componente per gestire l'estrazione automatica di campi da file CSV
 * Utilizza l'API backend per estrarre automaticamente i dati dei campi
 */
export function ImportFieldByCsv({
  companies,
  onImportSuccess,
  onCloseParentDrawer,
  embedded = false,
}: ImportFieldByCsvProps): React.ReactElement {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [showSupportForm, setShowSupportForm] = useState(false);

  /**
   * Gestisce l'estrazione automatica dei campi tramite API.
   * Supporta singolo file (CSV/Excel/PDF), shapefile multipli (.shp+.dbf+.shx) e ZIP.
   */
  const handleExtraction = async (files: File[]): Promise<void> => {
    if (!selectedCompanyId) {
      toast.error("Seleziona un'azienda prima di importare il file");
      return;
    }

    setIsProcessing(true);
    setImportErrors([]);
    setImportWarnings([]);

    try {
      toast.info("Estrazione campi in corso...", {
        description: "L'operazione potrebbe richiedere alcuni minuti",
      });

      const isShapefile = files.some((f) => {
        const name = f.name.toLowerCase();
        return name.endsWith(".shp") || name.endsWith(".zip");
      });

      const response = isShapefile
        ? await fieldsApiService.extractFromFiles(selectedCompanyId, files)
        : await fieldsApiService.startJobFieldExtraction(
            selectedCompanyId,
            files[0],
          );
      const primaryFile =
        files.find((file) => file.name.toLowerCase().endsWith(".zip")) ??
        files[0] ??
        null;
      let savedFile = null;
      if (primaryFile) {
        try {
          savedFile = await filesApiService.uploadFile({
            file: primaryFile,
            companyId: selectedCompanyId,
            path: "campi/import",
            type: "field-import",
          });
        } catch (error) {
          console.warn("Field source file upload failed:", error);
        }
      }
      const sourceFileId = savedFile?.data.file.id ?? null;

      if (!response.data?.fields || response.data.fields.length === 0) {
        toast.error("Nessun campo estratto dal file");
        setIsProcessing(false);
        return;
      }

      const mappedFields: BulkFieldInput[] = response.data.fields.map(
        (field) => ({
          companyId: field.companyId,
          sourceFileId,
          name: field.name,
          address: field.address || "",
          sezione: field.sezione || "",
          foglio: field.foglio || "",
          particella: field.particella || "",
          superficieCatastaleMq: field.superficieCatastaleMq || 0,
          coordinates: field.coordinates || [],
          latitude: field.latitude,
          longitude: field.longitude,
          polygon: field.polygon,
          gisHa: field.gisHa,
          sauHa: field.sauHa,
          ph: field.ph,
          nitrogen: field.nitrogen,
          phosphorus: field.phosphorus,
          potassium: field.potassium,
          calcium: field.calcium,
          magnesium: field.magnesium,
          soilType: field.soilType,
          uso: field.uso,
          qualita: field.qualita,
          subalterno: field.subalterno,
          nation: field.nation,
          region: field.region,
          city: field.city,
          cap: field.cap,
          variazioneMq: field.variazioneMq,
          inizioConduzione: field.inizioConduzione,
          fineConduzione: field.fineConduzione,
        }),
      );

      onImportSuccess(mappedFields);

      toast.success(
        `${response.data.extractedCount} camp${
          response.data.extractedCount === 1 ? "o estratto" : "i estratti"
        } con successo`,
      );

      setImportErrors([]);
      setImportWarnings([]);
      setSelectedCompanyId("");
      setShowSupportForm(false);
      if (embedded) {
        onCloseParentDrawer?.();
      } else {
        setIsDrawerOpen(false);
        onCloseParentDrawer?.();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Errore sconosciuto";
      toast.error(`Errore nell'estrazione: ${errorMessage}`);
      setImportErrors([errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Resetta lo stato quando il dialog viene chiuso
   */
  const handleDrawerOpenChange = (open: boolean): void => {
    setIsDrawerOpen(open);
    if (!open) {
      setImportErrors([]);
      setImportWarnings([]);
      setSelectedCompanyId("");
      setShowSupportForm(false);
    }
  };

  /**
   * Gestisce il download del template Excel
   */
  const handleDownloadTemplate = (): void => {
    const link = document.createElement("a");
    link.href = "/templates/2026.01_Template_field_piemonte.xlsx";
    link.download = "2026.01_Template_field_piemonte.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Gestisce la chiusura del form di supporto
   */
  const handleSupportRequestSuccess = (): void => {
    setShowSupportForm(false);
    toast.success("Richiesta inviata. Ti risponderemo al più presto.");
  };

  const importContent = (
    <ImportFieldByCsvContent
      companies={companies}
      selectedCompanyId={selectedCompanyId}
      onCompanyChange={setSelectedCompanyId}
      onFileSelect={handleExtraction}
      isProcessing={isProcessing}
      importErrors={importErrors}
      importWarnings={importWarnings}
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
            l'azienda e carica un file; i dati dei campi verranno estratti
            automaticamente.
          </DrawerDescription>
        </DrawerHeader>
        {importContent}
      </DrawerContent>
    </Drawer>
  );
}
