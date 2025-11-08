import { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, Trash2 } from "lucide-react";
import type { DosageProduct } from "@/api/dosage-agent";

type DosageProductsImporterProps = {
  products: DosageProduct[];
  onProductsChange: (products: DosageProduct[]) => void;
};

type CsvRow = {
  name: string;
  "numero di registrazione": string;
  quantità: string;
  "unità di misura": string;
  "nome fornitore"?: string;
  "partita iva"?: string;
};

export function DosageProductsImporter({
  products,
  onProductsChange,
}: DosageProductsImporterProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      toast.error("Formato file non valido", {
        description: "Il file deve essere in formato CSV",
      });
      return;
    }

    setIsLoading(true);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedProducts: DosageProduct[] = results.data.map(
            (row, index) => {
              // Validate required fields
              if (
                !row.name ||
                !row["numero di registrazione"] ||
                !row["quantità"] ||
                !row["unità di misura"]
              ) {
                throw new Error(
                  `Riga ${index + 1}: Campi obbligatori mancanti`
                );
              }

              const quantity = parseFloat(row["quantità"]);
              if (isNaN(quantity) || quantity <= 0) {
                throw new Error(
                  `Riga ${
                    index + 1
                  }: La quantità deve essere un numero positivo`
                );
              }

              return {
                productName: row.name.trim(),
                registrationNumber: row["numero di registrazione"].trim(),
                quantity,
                quantityUnitOfMeasure: row["unità di misura"].trim(),
                supplierName: row["nome fornitore"]?.trim() || undefined,
                supplierVat: row["partita iva"]?.trim() || undefined,
              };
            }
          );

          if (parsedProducts.length === 0) {
            throw new Error("Il file CSV non contiene prodotti validi");
          }

          onProductsChange(parsedProducts);
          toast.success("Prodotti importati con successo", {
            description: `${parsedProducts.length} prodotti caricati`,
          });
        } catch (error) {
          toast.error("Errore durante l'importazione", {
            description:
              error instanceof Error
                ? error.message
                : "Verifica il formato del file",
          });
        } finally {
          setIsLoading(false);
          // Reset input
          event.target.value = "";
        }
      },
      error: (error) => {
        toast.error("Errore durante la lettura del file", {
          description: error.message,
        });
        setIsLoading(false);
        event.target.value = "";
      },
    });
  };

  const handleClearProducts = () => {
    onProductsChange([]);
    toast.info("Prodotti rimossi");
  };

  return (
    <div className="space-y-6">
      {products.length === 0 ? (
        <div className="relative">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isLoading}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-neutral-200 rounded-xl cursor-pointer hover:border-neutral-300 hover:bg-neutral-50 transition-all"
          >
            <Upload className="h-12 w-12 text-neutral-400 mb-4" />
            <p className="text-base font-medium text-neutral-900 mb-2">
              Carica file CSV
            </p>
            <p className="text-sm text-neutral-500 max-w-md">
              Formato: name, numero di registrazione, quantità, unità di misura,
              nome fornitore, partita iva
            </p>
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="relative flex-1">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="cursor-pointer h-12"
            />
          </div>
          <Button
            variant="ghost"
            onClick={handleClearProducts}
            className="ml-3 text-neutral-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Rimuovi tutti
          </Button>
        </div>
      )}

      {products.length > 0 && (
        <div className="rounded-xl border border-neutral-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50">
                <TableHead className="font-medium">Nome Prodotto</TableHead>
                <TableHead className="font-medium">N. Registrazione</TableHead>
                <TableHead className="font-medium">Quantità</TableHead>
                <TableHead className="font-medium">Unità</TableHead>
                <TableHead className="font-medium">Fornitore</TableHead>
                <TableHead className="font-medium">P.IVA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, index) => (
                <TableRow key={index} className="hover:bg-neutral-50">
                  <TableCell className="font-medium">
                    {product.productName}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {product.registrationNumber}
                  </TableCell>
                  <TableCell className="text-neutral-900">
                    {product.quantity}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {product.quantityUnitOfMeasure}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {product.supplierName || "-"}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {product.supplierVat || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
