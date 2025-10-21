"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
export type Field = {
  id: string;
  name: string;
  area: number;
  usedArea: number;
};

type AreaVisualizerProps = {
  totalArea: number;
  allocatedArea: number;
  fields: Field[];
};

export function AreaVisualizer({
  totalArea,
  allocatedArea,
  fields,
}: AreaVisualizerProps) {
  const percentage = totalArea > 0 ? (allocatedArea / totalArea) * 100 : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Visualizzazione Area</CardTitle>
        <CardDescription>
          Rappresentazione grafica dell'area totale e utilizzata
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {totalArea > 0 ? (
          <>
            <div className="relative h-80 w-full overflow-hidden rounded-lg border-2 border-border bg-secondary">
              <div
                className="absolute left-0 top-0 h-full bg-primary transition-all duration-300"
                style={{ width: `${percentage}%` }}
              >
                <div className="flex h-full items-center justify-center">
                  <span className="text-sm font-semibold text-primary-foreground">
                    {allocatedArea.toFixed(2)} ha
                  </span>
                </div>
              </div>
              <div
                className="absolute right-0 top-0 flex h-full items-center justify-center"
                style={{ width: `${100 - percentage}%` }}
              >
                {percentage < 100 && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {(totalArea - allocatedArea).toFixed(2)} ha
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                Dettagli Campi
              </h4>
              <div className="space-y-2">
                {fields.map((field) => {
                  //   const fieldPercentage = (field.area / totalArea) * 100;
                  const usedPercentage = (field.usedArea / field.area) * 100;
                  return (
                    <div key={field.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {field.name}
                        </span>
                        <span className="font-medium text-foreground">
                          {field.usedArea.toFixed(2)} / {field.area} ha (
                          {usedPercentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${usedPercentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-80 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted">
            <p className="text-center text-sm text-muted-foreground">
              Aggiungi campi per visualizzare l'area
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
