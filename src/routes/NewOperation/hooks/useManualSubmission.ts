import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { jobsApiService } from "@/api/jobs";
import type { CreateJobPayload } from "@/api/jobs";
import { generateRandomJobId } from "@/routes/Job/utils";
import type { UnifiedProductRow } from "../types";

interface ProductionUnitInfo {
  id: string;
  areaHa: number;
}

export function useManualSubmission(
  productionUnitMap: Map<string, ProductionUnitInfo>,
) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (rows: UnifiedProductRow[], jobIdFromState?: string) => {
      if (rows.length === 0) {
        toast.error("Nessun prodotto nella tabella");
        return;
      }

      // Validate all rows
      const invalid = rows.some(
        (r) =>
          !r.productName.trim() ||
          !r.dateOfOperation ||
          (r.dosePerHa === null && r.quantity <= 0),
      );

      if (invalid) {
        toast.error("Dati incompleti", {
          description:
            "Ogni riga deve avere prodotto, data e dose o quantità",
        });
        return;
      }

      setIsSubmitting(true);
      const currentJobId = jobIdFromState ?? generateRandomJobId();

      try {
        const payloads: CreateJobPayload[] = [];

        for (const row of rows) {
          const hasUnits = row.selectedUnitIds.length > 0;

          if (hasUnits) {
            const totalTreatedHa = row.selectedUnitIds.reduce((sum, unitId) => {
              const unitInfo = productionUnitMap.get(unitId);
              return sum + (unitInfo?.areaHa ?? 0);
            }, 0);

            for (const unitId of row.selectedUnitIds) {
              const unitInfo = productionUnitMap.get(unitId);
              if (!unitInfo) continue;

              const unitShare =
                totalTreatedHa > 0 ? unitInfo.areaHa / totalTreatedHa : 1;

              let quantityForUnit: number;
              if (row.dosePerHa !== null && row.dosePerHa > 0) {
                quantityForUnit = row.dosePerHa * unitInfo.areaHa;
              } else {
                quantityForUnit = row.quantity * unitShare;
              }

              payloads.push({
                productionUnitId: unitId,
                dateOfOpeation: new Date(row.dateOfOperation).toISOString(),
                category: "TREATMENT",
                quantity: quantityForUnit,
                unitOfMeasureQuantity: row.unitOfMeasure,
                treatedSurface: unitInfo.areaHa,
                jobId: currentJobId,
                stocks: [
                  {
                    product: {
                      name: row.productName,
                      category: "PESTICIDE",
                      type: "Fitosanitario",
                      registrationNumber: row.registrationNumber,
                      ...(row.sku ? { sku: row.sku } : {}),
                    },
                    quantity: -quantityForUnit,
                    unitOfMeasureQuantity: row.unitOfMeasure,
                    type: "OUT",
                  },
                ],
              });
            }
          } else {
            // No units selected — LLM will match units later
            payloads.push({
              dateOfOpeation: new Date(row.dateOfOperation).toISOString(),
              category: "TREATMENT",
              quantity: row.quantity,
              unitOfMeasureQuantity: row.unitOfMeasure,
              jobId: currentJobId,
              stocks: [
                {
                  product: {
                    name: row.productName,
                    category: "PESTICIDE",
                    type: "FITOSANITARIO",
                    registrationNumber: row.registrationNumber,
                    ...(row.sku ? { sku: row.sku } : {}),
                  },
                  quantity: -row.quantity,
                  unitOfMeasureQuantity: row.unitOfMeasure,
                  type: "OUT",
                },
              ],
            });
          }
        }

        if (payloads.length === 0) {
          toast.error("Nessuna operazione da creare");
          setIsSubmitting(false);
          return;
        }

        const result = await jobsApiService.createProductAndJob(payloads);

        if (result.kind === "async") {
          queryClient.invalidateQueries({
            queryKey: ["job-groups-summary"],
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: ["job-group-detail"],
            refetchType: "none",
          });

          toast.success("Elaborazione avviata in background", {
            description:
              "Le unità produttive verranno assegnate automaticamente. Segui il progresso nella pagina interventi.",
          });
          navigate("/job", { state: { pendingTaskId: result.jobId } });
        } else {
          await queryClient.invalidateQueries({
            queryKey: ["job-groups-summary"],
          });
          await queryClient.invalidateQueries({
            queryKey: ["job-group-detail"],
          });

          toast.success("Operazioni create", {
            description: `${payloads.length} operazioni create con successo`,
          });
          navigate("/job");
        }
      } catch (err) {
        toast.error("Errore durante il salvataggio", {
          description:
            err instanceof Error ? err.message : "Riprova più tardi",
        });
        console.error(err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [productionUnitMap, navigate, queryClient],
  );

  return { submit, isSubmitting };
}
