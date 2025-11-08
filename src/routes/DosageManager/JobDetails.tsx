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
import { Clock } from "lucide-react";
import { type DosageJob } from "@/utils/dosageJobsIndexDBManager";

interface JobDetailsProps {
  showPanel: boolean;
  onPanelChange: (open: boolean) => void;
  activeJobs: DosageJob[];
  selectedJob: DosageJob | null;
  onSelectedJobChange: (job: DosageJob | null) => void;
}

export function JobDetails({
  showPanel,
  onPanelChange,
  activeJobs,
  selectedJob,
  onSelectedJobChange,
}: JobDetailsProps): React.ReactElement {
  return (
    <>
      <Sheet open={showPanel} onOpenChange={onPanelChange}>
        <SheetContent className="w-[400px] sm:w-[540px] bg-white p-2">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">Job Attivi</SheetTitle>
            <SheetDescription>
              Monitora lo stato dei calcoli in corso
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-4 pr-4">
              {activeJobs.length === 0 ? (
                <div className="text-center py-16 text-neutral-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                  <p>Nessun job in corso</p>
                </div>
              ) : (
                activeJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-6 rounded-xl border border-neutral-200 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Job {job.id}</h3>
                      <Badge variant="secondary">{job.state}</Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Prodotti:</span>
                        <span className="font-medium">{job.productsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Unità:</span>
                        <span className="font-medium">{job.unitsCount}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-neutral-600">Progresso</span>
                        <span className="font-medium">{job.progress}%</span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div
                          className="bg-neutral-900 h-2 rounded-full transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {selectedJob && (
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
              <SheetDescription>
                Dettagli e risultati del calcolo
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-120px)]">
              <div className="space-y-6 pr-4">
                {/* General Info */}
                <div className="p-6 rounded-xl border border-neutral-200 space-y-3">
                  <h4 className="font-medium text-neutral-900">Informazioni</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Stato</span>
                      <Badge>{selectedJob.state}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Progresso</span>
                      <span className="font-medium">
                        {selectedJob.progress}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Prodotti</span>
                      <span className="font-medium">
                        {selectedJob.productsCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Unità produttive</span>
                      <span className="font-medium">
                        {selectedJob.unitsCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Results */}
                {selectedJob.state === "completed" && selectedJob.result && (
                  <>
                    {/* Stock Balance */}
                    {selectedJob.result.stockBalance && (
                      <div className="p-6 rounded-xl border border-neutral-200 space-y-4">
                        <h4 className="font-medium text-neutral-900">
                          Bilancio Scorte
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 rounded-lg bg-neutral-50">
                            <div className="text-2xl font-semibold text-neutral-900">
                              {
                                selectedJob.result.stockBalance
                                  .productsWithinLimit
                              }
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

                    {/* Dosages */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-neutral-900">
                        Dosaggi Calcolati
                      </h4>
                      {selectedJob.result.outcomeWithDosage.map(
                        (outcome, idx) => (
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
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
