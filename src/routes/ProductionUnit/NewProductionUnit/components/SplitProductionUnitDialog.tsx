import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";

import type { ProductionUnitInput, ProductionUnitSplitPart } from "../types";
import { generateSplitUnitName, validateSplitSum } from "../utils";

type SplitProductionUnitDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  unit: ProductionUnitInput;
  onConfirm: (parts: ProductionUnitSplitPart[]) => void;
};

const createInitialParts = (
  unit: ProductionUnitInput,
  numberOfParts: number = 2,
): ProductionUnitSplitPart[] => {
  const totalArea =
    unit.totalAreaHa ??
    Array.from(unit.allocations.values()).reduce((sum, a) => sum + a, 0);

  const equalPart = parseFloat((totalArea / numberOfParts).toFixed(2));

  return Array.from({ length: numberOfParts }, (_, index) => ({
    id: `split-${Date.now()}-${index}`,
    name: generateSplitUnitName(unit.name, index),
    areaHa:
      index === numberOfParts - 1
        ? parseFloat((totalArea - equalPart * (numberOfParts - 1)).toFixed(2))
        : equalPart,
  }));
};

export const SplitProductionUnitDialog: React.FC<
  SplitProductionUnitDialogProps
> = ({ isOpen, onClose, unit, onConfirm }) => {
  const totalAreaHa = useMemo(() => {
    return (
      unit.totalAreaHa ??
      Array.from(unit.allocations.values()).reduce((sum, a) => sum + a, 0)
    );
  }, [unit]);

  const [parts, setParts] = useState<ProductionUnitSplitPart[]>(() =>
    createInitialParts(unit, 2),
  );

  const [customizedNames, setCustomizedNames] = useState<Set<string>>(
    new Set(),
  );

  React.useEffect(() => {
    if (isOpen) {
      setParts(createInitialParts(unit, 2));
      setCustomizedNames(new Set());
    }
  }, [isOpen, unit]);

  const validation = useMemo(
    () => validateSplitSum(parts, totalAreaHa),
    [parts, totalAreaHa],
  );

  const handleAddPart = useCallback(() => {
    if (parts.length >= 10) {
      toast.error("Massimo 10 frazioni consentite");
      return;
    }

    const newCount = parts.length + 1;
    const equalPart = parseFloat((totalAreaHa / newCount).toFixed(2));

    setParts((prev) => {
      const updated = prev.map((p, idx) => ({
        ...p,
        areaHa: equalPart,
        name: customizedNames.has(p.id)
          ? p.name
          : generateSplitUnitName(unit.name, idx),
      }));

      return [
        ...updated,
        {
          id: `split-${Date.now()}`,
          name: generateSplitUnitName(unit.name, newCount - 1),
          areaHa: parseFloat(
            (totalAreaHa - equalPart * (newCount - 1)).toFixed(2),
          ),
        },
      ];
    });
  }, [parts.length, totalAreaHa, unit.name, customizedNames]);

  const handleRemovePart = useCallback(
    (partId: string) => {
      if (parts.length <= 2) {
        toast.error("Minimo 2 frazioni richieste");
        return;
      }

      setParts((prev) => {
        const remaining = prev.filter((p) => p.id !== partId);
        const equalPart = parseFloat(
          (totalAreaHa / remaining.length).toFixed(2),
        );

        return remaining.map((p, idx) => ({
          ...p,
          areaHa:
            idx === remaining.length - 1
              ? parseFloat(
                  (totalAreaHa - equalPart * (remaining.length - 1)).toFixed(2),
                )
              : equalPart,
          name: customizedNames.has(p.id)
            ? p.name
            : generateSplitUnitName(unit.name, idx),
        }));
      });

      setCustomizedNames((prev) => {
        const next = new Set(prev);
        next.delete(partId);
        return next;
      });
    },
    [parts.length, totalAreaHa, unit.name, customizedNames],
  );

  const handleAreaChange = useCallback(
    (partId: string, newArea: number) => {
      setParts((prev) => {
        const partIndex = prev.findIndex((p) => p.id === partId);
        if (partIndex === -1) return prev;

        const clampedArea = Math.min(Math.max(0, newArea), totalAreaHa);

        const updated = [...prev];
        updated[partIndex] = {
          ...updated[partIndex],
          areaHa: parseFloat(clampedArea.toFixed(2)),
        };

        return updated;
      });
    },
    [totalAreaHa],
  );

  const handleNameChange = useCallback((partId: string, newName: string) => {
    setParts((prev) =>
      prev.map((p) => (p.id === partId ? { ...p, name: newName } : p)),
    );
    setCustomizedNames((prev) => new Set(prev).add(partId));
  }, []);

  const handleConfirm = () => {
    if (!validation.isValid) {
      toast.error(
        `La somma delle aree (${parts
          .reduce((s, p) => s + p.areaHa, 0)
          .toFixed(
            2,
          )} Ha) non corrisponde all'area totale (${totalAreaHa.toFixed(2)} Ha)`,
      );
      return;
    }

    if (parts.some((p) => p.areaHa <= 0)) {
      toast.error("Ogni frazione deve avere un'area maggiore di zero");
      return;
    }

    if (parts.some((p) => !p.name.trim())) {
      toast.error("Ogni frazione deve avere un nome");
      return;
    }

    onConfirm(parts);
    onClose();
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      direction="right"
    >
      <DrawerContent className="!w-[50vw] !max-w-[50vw] h-dvh flex flex-col">
        <DrawerHeader className="border-b">
          <DrawerTitle>Fraziona Unità Produttiva</DrawerTitle>
          <DrawerDescription>
            Dividi "{unit.name}" in più parti. L'area totale (
            {totalAreaHa.toFixed(2)} Ha) verrà ripartita proporzionalmente tra
            le frazioni.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{unit.name}</p>
                  <p className="text-sm text-gray-600">
                    {unit.allocations.size} campi allocati
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {totalAreaHa.toFixed(2)} Ha
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              validation.isValid
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {validation.isValid ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm">
              {validation.isValid
                ? "La ripartizione è corretta"
                : `Differenza: ${validation.difference.toFixed(2)} Ha`}
            </span>
            <span className="ml-auto text-sm font-medium">
              Totale: {parts.reduce((s, p) => s + p.areaHa, 0).toFixed(2)} /{" "}
              {totalAreaHa.toFixed(2)} Ha
            </span>
          </div>

          <Button
            variant="outline"
            onClick={handleAddPart}
            disabled={parts.length >= 10}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Frazione
          </Button>

          <div className="space-y-3">
            {parts.map((part, index) => (
              <Card key={part.id} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Nome Frazione {index + 1}
                        </label>
                        <Input
                          value={part.name}
                          onChange={(e) =>
                            handleNameChange(part.id, e.target.value)
                          }
                          placeholder={`${unit.name} ${index + 1}`}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">
                            Superficie
                          </label>
                          <span className="text-sm text-gray-500">
                            {((part.areaHa / totalAreaHa) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[part.areaHa]}
                            min={0.01}
                            max={totalAreaHa}
                            step={0.01}
                            onValueChange={([value]) =>
                              handleAreaChange(part.id, value)
                            }
                            className="flex-1"
                          />
                          <div className="w-24">
                            <Input
                              type="number"
                              min={0.01}
                              max={totalAreaHa}
                              step={0.01}
                              value={part.areaHa}
                              onChange={(e) =>
                                handleAreaChange(
                                  part.id,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="text-right"
                            />
                          </div>
                          <span className="text-sm text-gray-500 w-8">Ha</span>
                        </div>
                      </div>
                    </div>

                    {parts.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePart(part.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DrawerFooter className="border-t">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button onClick={handleConfirm} disabled={!validation.isValid}>
              Conferma Frazionamento
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
