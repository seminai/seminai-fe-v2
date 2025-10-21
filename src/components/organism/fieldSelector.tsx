"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Plus, X } from "lucide-react";
import { Field } from "./areaVisualizer";

type FieldSelectorProps = {
  selectedFields: Field[];
  onAddField: (field: Field) => void;
  onRemoveField: (id: string) => void;
  onFieldUsedAreaChange: (id: string, usedArea: number) => void;
};

export function FieldSelector({
  selectedFields,
  onAddField,
  onRemoveField,
  onFieldUsedAreaChange,
}: FieldSelectorProps) {
  const [fieldName, setFieldName] = useState("");
  const [fieldArea, setFieldArea] = useState("");

  const handleAddField = () => {
    if (fieldName && fieldArea && Number.parseFloat(fieldArea) > 0) {
      const area = Number.parseFloat(fieldArea);
      const newField: Field = {
        id: Date.now().toString(),
        name: fieldName,
        area,
        usedArea: area, // Initialize usedArea to full area by default
      };
      onAddField(newField);
      setFieldName("");
      setFieldArea("");
    }
  };

  const totalArea = selectedFields.reduce((sum, field) => sum + field.area, 0);
  const totalUsedArea = selectedFields.reduce(
    (sum, field) => sum + field.usedArea,
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seleziona Campi</CardTitle>
        <CardDescription>
          Aggiungi i campi e regola quanto utilizzarne con lo slider
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="field-name">Nome Campo</Label>
              <Input
                id="field-name"
                placeholder="es. Campo Nord"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-area">Area (ha)</Label>
              <Input
                id="field-area"
                type="number"
                step="0.1"
                min="0"
                placeholder="es. 2.5"
                value={fieldArea}
                onChange={(e) => setFieldArea(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleAddField} className="w-full" size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi Campo
          </Button>
        </div>

        {selectedFields.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Campi Selezionati
              </h3>
              <div className="text-right">
                <p className="text-sm font-medium text-primary">
                  Utilizzato: {totalUsedArea.toFixed(2)} ha
                </p>
                <p className="text-xs text-muted-foreground">
                  Totale: {totalArea.toFixed(2)} ha
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {selectedFields.map((field) => {
                const percentage = (field.usedArea / field.area) * 100;
                return (
                  <div
                    key={field.id}
                    className="rounded-lg border border-border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-primary" />
                          <p className="text-sm font-medium text-card-foreground">
                            {field.name}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          Area totale: {field.area} ha
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveField(field.id)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          Area utilizzata
                        </Label>
                        <span className="text-sm font-semibold text-primary">
                          {field.usedArea.toFixed(2)} ha (
                          {percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <Slider
                        value={[field.usedArea]}
                        min={0}
                        max={field.area}
                        step={0.1}
                        onValueChange={(value) =>
                          onFieldUsedAreaChange(field.id, value[0])
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
