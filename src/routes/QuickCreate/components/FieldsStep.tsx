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
import FileDropZone from "./FileDropZone";
import { FIELDS_COLUMNS } from "../types";

interface FieldsStepProps {
  fieldsData: ExtractedField[];
  onFieldsChange: (fields: ExtractedField[]) => void;
  onProductionUnitsExtracted: (pus: ExtractedProductionUnit[]) => void;
  onFileSelected: (file: File | null) => void;
  selectedFile: File | null;
  error: string | null;
  onError: (error: string | null) => void;
}

export default function FieldsStep({
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

  const handleFileSelect = React.useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      onFileSelected(files[0]);
      onError(null);
      setIsExtracting(true);

      try {
        const response = await quickCreateApiService.extractFromFile(files);

        onFieldsChange(response.data.fields);
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
    [onFileSelected, onError, onFieldsChange, onProductionUnitsExtracted],
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
