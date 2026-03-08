import * as React from "react";
import {
  EditableTable,
} from "@/components/organism/EditableTable";
import { Spinner } from "@/components/ui/spinner";
import { IoCheckmarkCircle } from "react-icons/io5";
import type {
  ExtractedField,
  ExtractedProductionUnit,
} from "@/api/quick-create";
import { quickCreateApiService } from "@/api/quick-create";
import { filesApiService } from "@/api/files";
import FileDropZone from "./FileDropZone";
import { FIELDS_COLUMNS } from "../types";

interface FieldsStepProps {
  companyId: string;
  fieldsData: ExtractedField[];
  onFieldsChange: (fields: ExtractedField[]) => void;
  onProductionUnitsExtracted: (pus: ExtractedProductionUnit[]) => void;
  onFileSelected: (file: File | null) => void;
  selectedFile: File | null;
  error: string | null;
  onError: (error: string | null) => void;
}

export default function FieldsStep({
  companyId,
  fieldsData,
  onFieldsChange,
  onProductionUnitsExtracted,
  onFileSelected,
  selectedFile,
  error,
  onError,
}: FieldsStepProps): React.ReactElement {
  const [isExtracting, setIsExtracting] = React.useState(false);
  const hasExtractedData = fieldsData.length > 0;
  const selectPrimarySourceFile = React.useCallback((files: File[]): File | null => {
    const preferredFile =
      files.find((file) => file.name.toLowerCase().endsWith(".zip")) ?? files[0];
    return preferredFile ?? null;
  }, []);

  const handleFileSelect = React.useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      onFileSelected(files[0]);
      onError(null);
      setIsExtracting(true);

      try {
        const primaryFile = selectPrimarySourceFile(files);
        let savedFile = null;
        if (companyId && primaryFile) {
          try {
            savedFile = await filesApiService.uploadFile({
              file: primaryFile,
              companyId,
              path: "campi/import",
              type: "field-import",
            });
          } catch (error) {
            console.warn("Field source file upload failed:", error);
          }
        }
        const response = await quickCreateApiService.extractFromFile(files);
        const sourceFileId = savedFile?.data.file.id ?? null;

        onFieldsChange(
          response.data.fields.map((field) => ({
            ...field,
            sourceFileId,
          })),
        );
        onProductionUnitsExtracted(response.data.productionUnits);
      } catch (err) {
        onError(
          err instanceof Error
            ? err.message
            : "Errore durante l'elaborazione del file",
        );
      } finally {
        setIsExtracting(false);
      }
    },
    [
      companyId,
      onFileSelected,
      onError,
      onFieldsChange,
      onProductionUnitsExtracted,
      selectPrimarySourceFile,
    ],
  );

  const handleFieldsSave = React.useCallback(
    (payload: {
      created: Array<Record<string, unknown>>;
      updated: Array<Record<string, unknown>>;
    }) => {
      const allFields = [
        ...payload.created,
        ...payload.updated,
      ] as unknown as ExtractedField[];
      if (allFields.length > 0) {
        onFieldsChange(allFields);
      }
    },
    [onFieldsChange],
  );

  // Show loading spinner while extracting
  if (isExtracting) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="flex flex-col items-center gap-6">
          <Spinner size={80} speed="normal" />
          <p className="text-lg text-neutral-600 font-medium">
            Elaborazione file in corso...
          </p>
        </div>
      </div>
    );
  }

  // Show file drop zone if no data extracted yet
  if (!hasExtractedData) {
    return (
      <div className="flex flex-col items-center justify-center flex-1">
        <h2 className="text-2xl font-semibold text-neutral-800 mb-2">
          Importa i dati
        </h2>
        <p className="text-neutral-500 mb-8 text-center max-w-lg">
          Carica un file CSV, Excel, PDF, Shapefile (.shp + .dbf + .shx) o ZIP
          per importare campi e unità produttive.
        </p>

        <FileDropZone
          onFileSelect={handleFileSelect}
          isDisabled={false}
        />

        {selectedFile && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-agri-green-50 rounded-xl">
            <IoCheckmarkCircle className="w-5 h-5 text-black" />
            <span className="text-black font-medium">
              {selectedFile.name}
            </span>
          </div>
        )}

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 max-w-lg">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Show editable table with extracted fields
  return (
    <>
      <h2 className="text-xl font-semibold text-neutral-800 mb-2 text-center">
        Conferma i campi
      </h2>
      <p className="text-neutral-500 mb-6 text-center">
        {fieldsData.length} campi trovati. Verifica e modifica i dati se necessario.
      </p>
      <EditableTable
        columns={FIELDS_COLUMNS}
        rows={fieldsData as unknown as Array<Record<string, unknown>>}
        isModify
        addButton
        createMode="inline"
        onSave={handleFieldsSave}
        getRowId={(row, index) => (row.name as string) || `field-${index}`}
        showDeleteAction
        exportFileName="campi"
      />
      {error && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}
    </>
  );
}
