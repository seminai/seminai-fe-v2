import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

import { CheckCircle, ChevronLeft } from "lucide-react";

import { format } from "date-fns";
import { it } from "date-fns/locale";

import { calculateCropDates } from "../utils";
import type {
  CropVariety,
  DateRange,
  FieldWithCompany,
  ProductionUnitInput,
} from "../types";

type ConfirmationStepProps = {
  productionUnits: ProductionUnitInput[];
  cropVarieties: CropVariety[];
  allFields: FieldWithCompany[];
  dateRange: DateRange;
  onPrevious: () => void;
  onConfirm: () => void;
  isCreating: boolean;
};

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  productionUnits,
  cropVarieties,
  allFields,
  dateRange,
  onPrevious,
  onConfirm,
  isCreating,
}) => {
  const getUnitArea = (unit: ProductionUnitInput): number => {
    return (
      unit.totalAreaHa ??
      Array.from(unit.allocations.values()).reduce((sum, area) => sum + area, 0)
    );
  };

  const totalSAU = productionUnits.reduce(
    (total, unit) => total + getUnitArea(unit),
    0
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Riepilogo Unità Produttive
        </h2>
        <p className="text-gray-600">
          Verifica i dati e conferma la creazione di {productionUnits.length}{" "}
          unità {productionUnits.length === 1 ? "produttiva" : "produttive"}
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Informazioni Generali</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">
                Unità produttive:
              </span>
              <p className="text-gray-900 text-lg font-semibold">
                {productionUnits.length}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">SAU Totale:</span>
              <p className="text-gray-900 text-lg font-semibold">
                {totalSAU.toFixed(2)} Ha
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Data inizio:</span>
              <p className="text-gray-900">
                {format(dateRange.start, "dd/MM/yyyy", { locale: it })}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Data fine:</span>
              <p className="text-gray-900">
                {format(dateRange.end, "dd/MM/yyyy", { locale: it })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Dettaglio Unità Produttive
        </h3>
        {productionUnits.map((unit, index) => {
          const crop = cropVarieties.find((v) => v.code === unit.cropCode);
          const unitTotalArea = getUnitArea(unit);

          const cropDates = crop
            ? calculateCropDates(crop, dateRange.start)
            : null;

          return (
            <Card key={unit.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      Unità {index + 1}
                    </Badge>
                    <CardTitle className="text-xl">{unit.name}</CardTitle>
                    <p className="text-gray-600 mt-1">
                      {crop?.species} - {crop?.cropType}
                    </p>
                  </div>
                  <Badge className="bg-green-600">
                    {unitTotalArea.toFixed(2)} Ha
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-3">
                    Informazioni Coltura
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Codice:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {crop?.code}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Resa stimata:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {crop?.estimatedYield.min}-{crop?.estimatedYield.max} kg/ha
                      </span>
                    </div>
                  </div>

                  {cropDates && (
                    <div className="mt-3 pt-3 border-t border-blue-300">
                      <h5 className="text-xs font-medium text-blue-800 mb-2">
                        Calendario Colturale
                      </h5>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white/50 p-2 rounded">
                          <span className="text-gray-600 block">Semina:</span>
                          <span className="font-medium text-gray-900">
                            {format(cropDates.sowingDate, "dd/MM/yyyy", {
                              locale: it,
                            })}
                          </span>
                        </div>
                        <div className="bg-white/50 p-2 rounded">
                          <span className="text-gray-600 block">Fioritura:</span>
                          <span className="font-medium text-gray-900">
                            {format(cropDates.floweringDate, "dd/MM/yyyy", {
                              locale: it,
                            })}
                          </span>
                        </div>
                        <div className="bg-white/50 p-2 rounded">
                          <span className="text-gray-600 block">Raccolta:</span>
                          <span className="font-medium text-gray-900">
                            {format(cropDates.harvestingDate, "dd/MM/yyyy", {
                              locale: it,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {(unit.protectionStructure ||
                  unit.occupazione ||
                  unit.destinazioneDiUso ||
                  unit.acquaTotalePeridoL > 0) && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {unit.protectionStructure && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Struttura:
                        </span>
                        <p>{unit.protectionStructure}</p>
                      </div>
                    )}
                    {unit.occupazione && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Occupazione:
                        </span>
                        <p>{unit.occupazione}</p>
                      </div>
                    )}
                    {unit.destinazioneDiUso && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Destinazione:
                        </span>
                        <p>{unit.destinazioneDiUso}</p>
                      </div>
                    )}
                    {unit.acquaTotalePeridoL > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Acqua:
                        </span>
                        <p>{unit.acquaTotalePeridoL.toLocaleString()} L</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">
                    Campi Allocati ({unit.allocations.size})
                  </h4>
                  <div className="space-y-2">
                    {Array.from(unit.allocations.entries()).map(
                      ([fieldId, area]) => {
                        const field = allFields.find((f) => f.id === fieldId);
                        if (!field) return null;
                        return (
                          <div
                            key={fieldId}
                            className="flex items-center justify-between p-2 bg-white rounded border"
                          >
                            <div>
                              <p className="font-medium text-sm">{field.name}</p>
                              <p className="text-xs text-gray-600">
                                {field.companyName}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {area.toFixed(2)} Ha
                            </Badge>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between gap-4 mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isCreating}
          className="min-w-32"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Indietro - Modifica Unità Produttive
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isCreating}
          className="min-w-48 bg-green-600 hover:bg-green-700"
        >
          {isCreating ? (
            <>
              <Spinner
                size={16}
                ariaLabel="Creazione in corso"
                className="mr-2"
              />
              Creazione in corso...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Crea {productionUnits.length} Unità{" "}
              {productionUnits.length === 1 ? "Produttiva" : "Produttive"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export { ConfirmationStep };
