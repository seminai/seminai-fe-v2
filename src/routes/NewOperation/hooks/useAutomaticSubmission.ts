import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  dosageAgentApiService,
  type DosageProduct,
  type DosageStrategy,
  type DosageUnitOfProduction,
  type DosageOrchestratorSettings,
  type StartDosageJobRequest,
} from "@/api/dosage-agent";
import {
  OrchestratorRequestBuilder,
  type OrchestratorDatasets,
} from "@/routes/DosageManager/orchestrator";
import type { ProductionUnit } from "@/api/production-unit";
import type { UnifiedProductRow } from "../types";

interface SubmitParams {
  rows: UnifiedProductRow[];
  globalStrategy: DosageStrategy;
  outStockLimiter: boolean;
  loadWarehouse: boolean;
  orchestratorSettings: DosageOrchestratorSettings;
  orchestratorDatasets: OrchestratorDatasets | null;
  selectedUnits: ProductionUnit[];
  startAt: string;
  endAt: string;
}

export function useAutomaticSubmission() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (params: SubmitParams) => {
      const {
        rows,
        globalStrategy,
        outStockLimiter,
        loadWarehouse,
        orchestratorSettings,
        orchestratorDatasets,
        selectedUnits,
        startAt,
        endAt,
      } = params;

      if (rows.length === 0) {
        toast.error("Nessun prodotto nella tabella", {
          description:
            "Aggiungi almeno un prodotto prima di calcolare i dosaggi",
        });
        return;
      }

      if (selectedUnits.length === 0) {
        toast.error("Nessuna unità produttiva selezionata", {
          description:
            "Seleziona almeno un'unità produttiva prima di calcolare i dosaggi",
        });
        return;
      }

      if (endAt && startAt && endAt < startAt) {
        toast.error("Date non valide", {
          description:
            "La data di fine non può essere prima della data di inizio",
        });
        return;
      }

      setIsSubmitting(true);

      try {
        // Build products payload
        const products: DosageProduct[] = rows.map((row) => ({
          productName: row.productName,
          registrationNumber: row.registrationNumber,
          quantity: row.quantity,
          quantityUnitOfMeasure: row.unitOfMeasure,
          loadWarehouse: row.loadWarehouse || loadWarehouse,
          supplierName: row.supplierName,
          supplierVat: row.supplierVat,
          ddtDate: row.ddtDate,
          orderNumber: row.orderNumber,
          ...(row.strategy ? { strategy: row.strategy } : {}),
        }));

        // Build units of production
        const unitsOfProduction: DosageUnitOfProduction[] = selectedUnits.map(
          (unit) => ({
            id: unit.productionUnit.id,
            name: unit.productionUnit.name,
            cropName: unit.productionUnit.cropName,
            cropType: unit.productionUnit.cropType,
            variety: unit.productionUnit.variety,
            cropVariety: unit.productionUnit.variety,
            areaHa: unit.productionUnit.areaHa,
            startDate: unit.productionUnit.startDate,
            floweringDate: unit.productionUnit.floweringDate,
            harvestingDate: unit.productionUnit.harvestingDate,
            endDate: unit.productionUnit.endDate,
            protocoll: unit.productionUnit.protocoll,
            protectionStructure: unit.productionUnit.protectionStructure,
            disciplinari: [],
            occupazione: unit.productionUnit.occupazione,
            destinazioneDiUso: unit.productionUnit.destinazioneDiUso,
            acquaTotalePeridoL: unit.productionUnit.acquaTotalePeridoL,
          }),
        );

        const requestPayload: StartDosageJobRequest = {
          products,
          unitOfProduction: unitsOfProduction,
          strategy: globalStrategy,
          outStockLimiter,
          orchestrator: OrchestratorRequestBuilder.build(
            orchestratorSettings,
            orchestratorDatasets,
          ),
        };

        if (startAt) requestPayload.startAt = startAt;
        if (endAt) requestPayload.endAt = endAt;

        const response =
          await dosageAgentApiService.startJob(requestPayload);
        const jobId = response.data.jobId;

        queryClient.invalidateQueries({
          queryKey: ["job-groups-summary"],
          refetchType: "none",
        });
        queryClient.invalidateQueries({
          queryKey: ["job-group-detail"],
          refetchType: "none",
        });

        toast.success("Calcolo dosaggi avviato", {
          description: `Job ID: ${jobId}`,
        });

        navigate("/job", { state: { pendingJobId: jobId } });
      } catch (error) {
        toast.error("Errore durante l'avvio del calcolo", {
          description:
            error instanceof Error ? error.message : "Riprova più tardi",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigate, queryClient],
  );

  return { submit, isSubmitting };
}
