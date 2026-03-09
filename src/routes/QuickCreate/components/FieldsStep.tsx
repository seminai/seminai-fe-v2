import * as React from "react";
import {
  EditableTable,
} from "@/components/organism/EditableTable";
import { IoCheckmarkCircle } from "react-icons/io5";
import type {
  ExtractedField,
  ExtractedProductionUnit,
} from "@/api/quick-create";
import { filesApiService } from "@/api/files";
import { useExtractionProgress } from "@/hooks/useExtractionProgress";
import ExtractionProgressPanel from "@/components/molecules/ExtractionProgressPanel";
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
  const { state: extractionState, startExtraction, cancelExtraction } = useExtractionProgress();
  const hasExtractedData = fieldsData.length > 0;
  const sourceFileIdRef = React.useRef<string | null>(null);

  const selectPrimarySourceFile = React.useCallback((files: File[]): File | null => {
    const preferredFile =
      files.find((file) => file.name.toLowerCase().endsWith(".zip")) ?? files[0];
    return preferredFile ?? null;
  }, []);

  React.useEffect(() => {
    if (extractionState.result && !hasExtractedData) {
      const sourceFileId = sourceFileIdRef.current;
      onFieldsChange(
        extractionState.result.fields.map((field) => ({
          ...field,
          sourceFileId,
        })),
      );
      onProductionUnitsExtracted(
        extractionState.result.productionUnits as ExtractedProductionUnit[],
      );
    }
  }, [extractionState.result, hasExtractedData, onFieldsChange, onProductionUnitsExtracted]);

  React.useEffect(() => {
    if (extractionState.error) {
      onError(extractionState.error);
    }
  }, [extractionState.error, onError]);

  const handleFileSelect = React.useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      onFileSelected(files[0]);
      onError(null);

      const primaryFile = selectPrimarySourceFile(files);
      if (companyId && primaryFile) {
        try {
          const savedFile = await filesApiService.uploadFile({
            file: primaryFile,
            companyId,
            path: "campi/import",
            type: "field-import",
          });
          sourceFileIdRef.current = savedFile?.data.file.id ?? null;
        } catch (uploadError) {
          console.warn("Field source file upload failed:", uploadError);
          sourceFileIdRef.current = null;
        }
      }

      await startExtraction(files);
    },
    [companyId, onFileSelected, onError, selectPrimarySourceFile, startExtraction],
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

  if (extractionState.isExtracting) {
    return <ExtractionProgressPanel state={extractionState} onCancel={cancelExtraction} />;
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
