import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { type DosageJob } from "@/utils/dosageJobsIndexDBManager";

interface JobDetailsProps {
  selectedJob: DosageJob | null;
  onSelectedJobChange: (job: DosageJob | null) => void;
  jobDetailsLoading: boolean;
}

export function JobDetails({
  selectedJob,
  onSelectedJobChange,
  jobDetailsLoading,
}: JobDetailsProps): React.ReactElement | null {
  if (!selectedJob) {
    return null;
  }

  return (
    <Sheet
      open={Boolean(selectedJob)}
      onOpenChange={(open) => {
        if (!open) {
          onSelectedJobChange(null);
        }
      }}
    >
      <SheetContent className="w-[500px] sm:w-[600px] sm:max-w-[90vw] bg-white p-2">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl">Job {selectedJob.id}</SheetTitle>
          <SheetDescription>Dettagli e risultati del calcolo</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="space-y-6 pr-4">
            {jobDetailsLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            )}

            <div className="p-6 rounded-xl border border-neutral-200 space-y-3">
              <h4 className="font-medium text-neutral-900">Informazioni</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Stato</span>
                  <Badge>{selectedJob.state}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Progresso</span>
                  <span className="font-medium">{selectedJob.progress}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Prodotti</span>
                  <span className="font-medium">
                    {selectedJob.productsCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Unità produttive</span>
                  <span className="font-medium">{selectedJob.unitsCount}</span>
                </div>
              </div>
            </div>

            {selectedJob.state === "completed" && selectedJob.result && (
              <>
                {selectedJob.result.stockBalance && (
                  <div className="p-6 rounded-xl border border-neutral-200 space-y-4">
                    <h4 className="font-medium text-neutral-900">
                      Bilancio Scorte
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-neutral-50">
                        <div className="text-2xl font-semibold text-neutral-900">
                          {selectedJob.result.stockBalance.productsWithinLimit}
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">
                          Nei limiti
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-red-50">
                        <div className="text-2xl font-semibold text-red-900">
                          {selectedJob.result.stockBalance.productsOverused}
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          Oltre limite
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-medium text-neutral-900">
                    Dosaggi Calcolati
                  </h4>
                  {selectedJob.result.outcomeWithDosage.map((outcome, idx) => (
                    <div
                      key={idx}
                      className="p-6 rounded-xl border border-neutral-200 space-y-4"
                    >
                      <div>
                        <h5 className="font-medium text-neutral-900">
                          {outcome.cropName} - {outcome.variety}
                        </h5>
                        <p className="text-sm text-neutral-600 mt-1">
                          Area: {outcome.areaHa} ha
                        </p>
                      </div>
                      <div className="space-y-3">
                        {outcome.products.map((product, productIndex) => (
                          <div
                            key={productIndex}
                            className="pt-3 border-t border-neutral-100 first:pt-0 first:border-0"
                          >
                            <p className="font-medium text-sm text-neutral-900">
                              {product.productName}
                            </p>
                            {product.dosage && (
                              <div className="mt-2 p-3 rounded-lg bg-neutral-50 text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-neutral-600">
                                    Consigliato:
                                  </span>
                                  <span className="font-medium text-neutral-900">
                                    {product.dosage.recommendedDosage}{" "}
                                    {product.dosage.unitOfMeasure}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-600">
                                    Range:
                                  </span>
                                  <span className="text-neutral-900">
                                    {product.dosage.minDosage} -{" "}
                                    {product.dosage.maxDosage}{" "}
                                    {product.dosage.unitOfMeasure}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
