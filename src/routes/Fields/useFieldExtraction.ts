import { useCallback, useEffect, useRef, useState } from "react";
import {
  type BulkFieldInput,
  type ExtractedFieldDto,
  type FieldExtractionResponse,
  fieldsApiService,
} from "@/api/fields";
import { filesApiService } from "@/api/files";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 5_000;
const INTERPOLATION_INTERVAL_MS = 1_500;
const INTERPOLATION_INCREMENT = 0.6;

function mapFieldsToImport(
  fields: ExtractedFieldDto[],
  sourceFileId: string | null,
): BulkFieldInput[] {
  return fields.map((field) => ({
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
  }));
}

export interface FieldExtractionState {
  isProcessing: boolean;
  progress: number | null;
  message: string | null;
  elapsedMs: number;
  errors: string[];
  warnings: string[];
}

interface UseFieldExtractionParams {
  onSuccess: (fields: BulkFieldInput[]) => void;
  onDone?: () => void;
}

export function useFieldExtraction({ onSuccess, onDone }: UseFieldExtractionParams) {
  const [state, setState] = useState<FieldExtractionState>({
    isProcessing: false,
    progress: null,
    message: null,
    elapsedMs: 0,
    errors: [],
    warnings: [],
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interpolationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRealProgressRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    if (interpolationTimerRef.current) {
      clearInterval(interpolationTimerRef.current);
      interpolationTimerRef.current = null;
    }
    startTimeRef.current = null;
    lastRealProgressRef.current = 0;
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    startTimeRef.current = Date.now();

    elapsedTimerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setState((s) => ({ ...s, elapsedMs: Date.now() - startTimeRef.current! }));
      }
    }, 1_000);

    interpolationTimerRef.current = setInterval(() => {
      setState((s) => {
        if (s.progress === null || s.progress >= 95) return s;
        const ceiling = Math.min(lastRealProgressRef.current + 8, 95);
        const next = Math.min(s.progress + INTERPOLATION_INCREMENT, ceiling);
        return { ...s, progress: next };
      });
    }, INTERPOLATION_INTERVAL_MS);
  }, [clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const resetProcessing = useCallback(() => {
    pollingRef.current = false;
    clearTimers();
    setState((s) => ({ ...s, isProcessing: false, progress: null, message: null, elapsedMs: 0 }));
  }, [clearTimers]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    clearTimers();
    resetProcessing();
  }, [clearTimers, resetProcessing]);

  const handleResult = useCallback(
    (fields: ExtractedFieldDto[], sourceFileId: string | null, count: number) => {
      clearTimers();
      const mapped = mapFieldsToImport(fields, sourceFileId);
      onSuccess(mapped);
      toast.success(
        `${count} camp${count === 1 ? "o estratto" : "i estratti"} con successo`,
      );
      setState({ isProcessing: false, progress: null, message: null, elapsedMs: 0, errors: [], warnings: [] });
      onDone?.();
    },
    [clearTimers, onDone, onSuccess],
  );

  const handleSyncResult = useCallback(
    (response: FieldExtractionResponse, sourceFileId: string | null) => {
      resetProcessing();
      if (!response.data?.fields || response.data.fields.length === 0) {
        toast.error("Nessun campo estratto dal file");
        return;
      }
      handleResult(response.data.fields, sourceFileId, response.data.extractedCount);
    },
    [handleResult, resetProcessing],
  );

  const pollJobUntilDone = useCallback(
    async (jobId: string, signal: AbortSignal, sourceFileId: string | null) => {
      pollingRef.current = true;
      while (pollingRef.current && !signal.aborted) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (signal.aborted) return;

        const status = await fieldsApiService.getFieldExtractionStatus(jobId, signal);

        if (status.status === "processing") {
          const realProgress = status.data.progress ?? 0;
          lastRealProgressRef.current = realProgress;
          setState((s) => ({
            ...s,
            progress: Math.max(s.progress ?? 0, realProgress),
            message: status.data.message ?? null,
          }));
          continue;
        }

        if (status.status === "success") {
          resetProcessing();
          if (status.data.fields.length === 0) {
            toast.error("Nessun campo estratto dal file");
            return;
          }
          handleResult(status.data.fields, sourceFileId, status.data.extractedCount);
          return;
        }

        if (status.status === "error") {
          resetProcessing();
          toast.error(status.message || "Estrazione fallita");
          setState((s) => ({ ...s, errors: [status.message || "Estrazione fallita"] }));
          return;
        }
      }
    },
    [handleResult, resetProcessing],
  );

  const uploadSourceFile = useCallback(
    async (files: File[], companyId: string): Promise<string | null> => {
      const primaryFile =
        files.find((f) => f.name.toLowerCase().endsWith(".zip")) ?? files[0] ?? null;
      if (!primaryFile) return null;
      try {
        const saved = await filesApiService.uploadFile({
          file: primaryFile,
          companyId,
          path: "campi/import",
          type: "field-import",
        });
        return saved?.data.file.id ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  const startExtraction = useCallback(
    async (files: File[], companyId: string) => {
      if (!companyId) {
        toast.error("Seleziona un'azienda prima di importare il file");
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState({ isProcessing: true, progress: null, message: null, elapsedMs: 0, errors: [], warnings: [] });

      try {
        const isShapefile = files.some((f) => {
          const name = f.name.toLowerCase();
          return name.endsWith(".shp") || name.endsWith(".zip");
        });

        if (isShapefile) {
          const response = await fieldsApiService.extractFromFiles(
            companyId, files, controller.signal,
          );
          const sourceFileId = await uploadSourceFile(files, companyId);
          handleSyncResult(response, sourceFileId);
          return;
        }

        const result = await fieldsApiService.startJobFieldExtraction(
          companyId, files[0], controller.signal,
        );

        if (result.kind === "completed") {
          const sourceFileId = await uploadSourceFile(files, companyId);
          handleSyncResult(result.response, sourceFileId);
          return;
        }

        toast.info("Estrazione PDF in corso...", {
          description: "L'operazione potrebbe richiedere alcuni minuti",
        });
        startTimers();
        lastRealProgressRef.current = 5;
        setState((s) => ({ ...s, progress: 5, message: "Analisi PDF..." }));

        const sourceFileId = await uploadSourceFile(files, companyId);
        await pollJobUntilDone(result.jobId, controller.signal, sourceFileId);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error(`Errore nell'estrazione: ${msg}`);
        setState((s) => ({ ...s, errors: [msg] }));
      } finally {
        resetProcessing();
      }
    },
    [handleSyncResult, pollJobUntilDone, resetProcessing, startTimers, uploadSourceFile],
  );

  return { state, startExtraction, cancel } as const;
}
