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

import type { ParsedBulkImport } from "@/utils/csvProductionUnitParser";

type ImportedDataConfirmationStepProps = {
  importedData: ParsedBulkImport[];
  onPrevious: () => void;
  onConfirm: () => void;
  isCreating: boolean;
};

const ImportedDataConfirmationStep: React.FC<
  ImportedDataConfirmationStepProps
> = ({ importedData, onPrevious, onConfirm, isCreating }) => {
  const totalFields = importedData.reduce(
    (sum, company) => sum + company.fields.length,
    0
  );
  const totalProductionUnits = importedData.reduce(
    (sum, company) => sum + company.productionUnits.length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Conferma Importazione Dati CSV
        </h2>
        <p className="text-gray-600">
          Verifica i dati importati prima di procedere con la creazione
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Riepilogo Importazione</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Aziende:</span>
              <p className="text-gray-900 text-lg font-semibold">
                {importedData.length}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Campi Totali:</span>
              <p className="text-gray-900 text-lg font-semibold">
                {totalFields}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">
                Unità Produttive Totali:
              </span>
              <p className="text-gray-900 text-lg font-semibold">
                {totalProductionUnits}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Dettaglio per Azienda
        </h3>
        {importedData.map((company, index) => (
          <Card key={index} className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="outline" className="mb-2">
                    Azienda {index + 1}
                  </Badge>
                  <CardTitle className="text-xl">{company.companyName}</CardTitle>
                  <p className="text-gray-600 mt-1">P.IVA: {company.vatNumber}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">
                  Campi ({company.fields.length})
                </h4>
                <div className="space-y-2">
                  {company.fields.slice(0, 3).map((field, fieldIndex) => (
                    <div
                      key={fieldIndex}
                      className="flex items-center justify-between p-2 bg-white rounded border text-sm"
                    >
                      <div>
                        <p className="font-medium">{field.name}</p>
                        <p className="text-xs text-gray-600">
                          {field.address}, {field.city}
                          {field.sezione &&
                            ` • Sez. ${field.sezione} Fg. ${field.foglio} Part. ${field.particella}`}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {field.sauHa?.toFixed(2) ||
                          field.gisHa?.toFixed(2) ||
                          "N/A"}{" "}
                        Ha
                      </Badge>
                    </div>
                  ))}
                  {company.fields.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">
                      ... e altri {company.fields.length - 3} campi
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">
                  Unità Produttive ({company.productionUnits.length})
                </h4>
                <div className="space-y-3">
                  {company.productionUnits.map((pu, puIndex) => (
                    <Card key={puIndex} className="bg-green-50 border-green-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-green-900">{pu.name}</p>
                            <p className="text-sm text-green-700">
                              {pu.cropName} - {pu.cropType}
                            </p>
                          </div>
                          <Badge className="bg-green-600">
                            {pu.fieldAllocations
                              .reduce((sum, a) => sum + a.areaHa, 0)
                              .toFixed(2)}{" "}
                            Ha
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 mt-2">
                          <div>
                            <span className="font-medium">Varietà:</span>{" "}
                            {pu.variety}
                          </div>
                          <div>
                            <span className="font-medium">Protocollo:</span>{" "}
                            {pu.protocoll}
                          </div>
                          <div>
                            <span className="font-medium">Struttura:</span>{" "}
                            {pu.protectionStructure}
                          </div>
                          <div>
                            <span className="font-medium">Allocazioni:</span>{" "}
                            {pu.fieldAllocations.length}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between gap-4 mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isCreating}
          className="min-w-32"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Annulla e Torna Indietro
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
                ariaLabel="Importazione in corso"
                className="mr-2"
              />
              Importazione in corso...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Conferma e Importa Tutto
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export { ImportedDataConfirmationStep };

