import * as React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  labelsApiService,
  type BulkExtractItem,
  type BulkExtractRequest,
} from "@/api/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface LabelFormItem extends BulkExtractItem {
  id: string;
}

export default function NewLabel(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<LabelFormItem[]>([
    { id: crypto.randomUUID(), name: "", regNumber: "" },
  ]);
  const [concurrency, setConcurrency] = useState<number>(2);

  const mutation = useMutation({
    mutationFn: async (request: BulkExtractRequest) => {
      return await labelsApiService.bulkExtract(request);
    },
    onSuccess: (response) => {
      const { processed, successful, failed } = response.data;
      toast.success(
        `Elaborazione completata: ${successful}/${processed} successi, ${failed} falliti`
      );
      queryClient.invalidateQueries({ queryKey: ["labels", "summary"] });
      navigate("/label");
    },
    onError: (error: Error) => {
      toast.error(`Errore durante l'estrazione: ${error.message}`);
    },
  });

  const handleAddItem = (): void => {
    setItems([...items, { id: crypto.randomUUID(), name: "", regNumber: "" }]);
  };

  const handleRemoveItem = (id: string): void => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (
    id: string,
    field: keyof BulkExtractItem,
    value: string
  ): void => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    const validItems = items.filter(
      (item) => item.name.trim() !== "" && item.regNumber.trim() !== ""
    );

    if (validItems.length === 0) {
      toast.error("Inserisci almeno un'etichetta valida");
      return;
    }

    const request: BulkExtractRequest = {
      items: validItems.map(({ name, regNumber }) => ({ name, regNumber })),
      concurrency,
    };

    mutation.mutate(request);
  };

  const canRemove = items.length > 1;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Aggiungi Etichette</h1>
        <p className="text-sm text-gray-600">
          Inserisci le informazioni delle etichette da cui estrarre i dati
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Etichette da Processare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex gap-4 items-start p-4 border rounded-lg bg-gray-50"
              >
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${item.id}`}>
                      Nome Prodotto <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`name-${item.id}`}
                      type="text"
                      placeholder="es. REVOLUTION"
                      value={item.name}
                      onChange={(e) =>
                        handleItemChange(item.id, "name", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`regNumber-${item.id}`}>
                      Numero Registrazione{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`regNumber-${item.id}`}
                      type="text"
                      placeholder="es. 16667"
                      value={item.regNumber}
                      onChange={(e) =>
                        handleItemChange(item.id, "regNumber", e.target.value)
                      }
                      required
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={!canRemove}
                  className="mt-8"
                  title={
                    canRemove ? "Rimuovi" : "Almeno un'etichetta richiesta"
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddItem}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Etichetta
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Impostazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="concurrency">
                Concorrenza (numero di elaborazioni parallele)
              </Label>
              <Input
                id="concurrency"
                type="number"
                min={1}
                max={10}
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                className="max-w-xs"
              />
              <p className="text-xs text-gray-500">
                Numero di etichette elaborate contemporaneamente (1-10)
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/label")}
            disabled={mutation.isPending}
          >
            Annulla
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner size={16} className="mr-2" />
                Elaborazione in corso...
              </>
            ) : (
              "Avvia Estrazione"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
