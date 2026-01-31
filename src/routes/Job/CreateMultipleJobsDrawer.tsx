import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MultiSearchableSelect } from "../DosageManager/MultiSearchableSelect";

interface ProductionUnitOption {
  id: string;
  name: string;
  cropName: string;
  cropType: string;
  companyId: string;
  companyName: string;
  value: string;
  label: string;
}

interface ProductOption {
  value: string;
  label: string;
  registrationNumber: string;
  productName: string;
  activeIngredients: string;
}

interface CompanyOption {
  value: string;
  label: string;
  companyId: string;
  companyName: string;
}

interface CreateMultipleJobsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: CompanyOption[];
  productionUnits: ProductionUnitOption[];
  products: ProductOption[];
  isLoadingProducts: boolean;
  onSave: (jobs: Array<Record<string, unknown>>) => void;
}

export function CreateMultipleJobsDrawer({
  open,
  onOpenChange,
  companies,
  productionUnits,
  products,
  isLoadingProducts,
  onSave,
}: CreateMultipleJobsDrawerProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [dateOfOperation, setDateOfOperation] = useState<Date>(() => new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [quantity, setQuantity] = useState<string>("");
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>("L");

  // Reset quando si chiude la drawer
  useEffect(() => {
    if (!open) {
      setSelectedCompanyId("");
      setSelectedUnitIds([]);
      setSelectedProductIds([]);
      setDateOfOperation(new Date());
      setDatePickerOpen(false);
      setQuantity("");
      setUnitOfMeasure("L");
    }
  }, [open]);

  // Filtra le unità produttive per azienda selezionata
  const filteredUnits = useMemo(() => {
    if (!selectedCompanyId) return [];
    return productionUnits.filter((pu) => pu.companyId === selectedCompanyId);
  }, [selectedCompanyId, productionUnits]);

  // Opzioni per MultiSearchableSelect
  const unitOptions = useMemo(() => {
    return filteredUnits.map((pu) => ({
      value: pu.id,
      label: pu.name,
      description: `${pu.cropName} - ${pu.cropType}`,
    }));
  }, [filteredUnits]);

  const productOptions = useMemo(() => {
    return products.map((p) => ({
      value: p.registrationNumber,
      label: p.productName,
      description: p.activeIngredients,
    }));
  }, [products]);

  // Ottieni gli oggetti completi selezionati
  const selectedUnits = useMemo(() => {
    return productionUnits.filter((pu) => selectedUnitIds.includes(pu.id));
  }, [productionUnits, selectedUnitIds]);

  const selectedProducts = useMemo(() => {
    return products.filter((p) => selectedProductIds.includes(p.registrationNumber));
  }, [products, selectedProductIds]);

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.companyId === selectedCompanyId);
  }, [companies, selectedCompanyId]);

  // Calcola il numero di job che verranno creati
  const totalJobs = selectedUnitIds.length * selectedProductIds.length;

  const canSave =
    selectedCompanyId &&
    selectedUnitIds.length > 0 &&
    selectedProductIds.length > 0 &&
    dateOfOperation &&
    quantity &&
    parseFloat(quantity) > 0;

  const handleSave = () => {
    if (!canSave) return;

    const jobs: Array<Record<string, unknown>> = [];

    // Genera tutte le combinazioni UP × Prodotto
    selectedUnits.forEach((unit) => {
      selectedProducts.forEach((product) => {
        jobs.push({
          // Campi identificativi
          _productionUnitId: unit.id,
          productionUnitName: unit.name,
          cropName: unit.cropName,
          cropType: unit.cropType,
          _companyId: unit.companyId,
          companyName: unit.companyName,
          _selectedCompanyForPU: unit.companyId,

          // Prodotto
          productRegistrationNumber: product.registrationNumber,
          productName: product.productName,
          principioAttivo: product.activeIngredients,

          // Campi comuni
          dateOfOpeation: dateOfOperation,
          quantity: parseFloat(quantity),
          unitOfMeasureQuantity: unitOfMeasure,

          // Campi di default
          isVerified: "Conformità non verificata",
          _isVerifiedBoolean: false,
          _conformityChecked: false,
        });
      });
    });

    onSave(jobs);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="!w-[95vw] !max-w-[95vw] sm:!w-1/2 sm:!max-w-[50vw] overflow-x-hidden"
      >
        <DrawerHeader className="px-4 sm:px-6">
          <DrawerTitle className="text-lg sm:text-xl">
            Crea Operazioni Multiple
          </DrawerTitle>
          <DrawerDescription className="text-sm mt-1.5">
            Seleziona azienda, unità produttive e prodotti per generare
            automaticamente tutte le combinazioni
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-180px)]">
          {/* Azienda */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Azienda <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedCompanyId}
              onValueChange={(value) => {
                setSelectedCompanyId(value);
                // Reset unità produttive quando cambia azienda
                if (value !== selectedCompanyId) {
                  setSelectedUnitIds([]);
                }
              }}
            >
              <SelectTrigger className="h-11 sm:h-10">
                <SelectValue placeholder="Seleziona azienda..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.companyId} value={company.companyId}>
                    {company.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unità Produttive */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Unità Produttive <span className="text-red-500">*</span>
            </Label>
            {!selectedCompanyId ? (
              <div className="text-sm text-muted-foreground italic border border-dashed rounded-md p-3">
                Seleziona prima un'azienda
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-sm text-muted-foreground italic border border-dashed rounded-md p-3">
                Nessuna unità produttiva disponibile per questa azienda
              </div>
            ) : (
              <MultiSearchableSelect
                value={selectedUnitIds}
                options={unitOptions}
                placeholder="Seleziona una o più unità produttive..."
                searchPlaceholder="Cerca unità produttiva..."
                emptyMessage="Nessuna unità produttiva trovata"
                onChange={setSelectedUnitIds}
              />
            )}
          </div>

          {/* Prodotti */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Prodotti <span className="text-red-500">*</span>
            </Label>
            {isLoadingProducts ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2 border border-dashed rounded-md p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento prodotti...
              </div>
            ) : (
              <MultiSearchableSelect
                value={selectedProductIds}
                options={productOptions}
                placeholder="Seleziona uno o più prodotti..."
                searchPlaceholder="Cerca prodotto..."
                emptyMessage="Nessun prodotto trovato"
                onChange={setSelectedProductIds}
              />
            )}
          </div>

          {/* Data Operazione */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Data Operazione <span className="text-red-500">*</span>
            </Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-11 sm:h-10 rounded-xl border border-black/5 bg-white hover:bg-white",
                    !dateOfOperation && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateOfOperation
                    ? format(dateOfOperation, "dd/MM/yyyy", { locale: it })
                    : "Seleziona data..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-transparent border-0 shadow-none" align="start">
                <Calendar
                  mode="single"
                  selected={dateOfOperation}
                  onSelect={(date) => {
                    if (date) {
                      setDateOfOperation(date);
                      setDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                  locale={it}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Quantità */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Quantità <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.000"
                className="h-11 sm:h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Unità di Misura <span className="text-red-500">*</span>
              </Label>
              <Select value={unitOfMeasure} onValueChange={setUnitOfMeasure}>
                <SelectTrigger className="h-11 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="ML">ML</SelectItem>
                  <SelectItem value="G">G</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Riepilogo */}
          {totalJobs > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
              <p className="text-sm font-semibold text-blue-900">
                Riepilogo Operazioni
              </p>
              <div className="text-xs text-blue-700 space-y-1">
                <p>
                  • {selectedUnitIds.length} unità produttive ×{" "}
                  {selectedProductIds.length} prodotti
                </p>
                <p className="font-semibold">
                  = {totalJobs} operazioni che verranno create
                </p>
                {selectedCompany && (
                  <p className="mt-2 text-blue-600">
                    Azienda: {selectedCompany.companyName}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="flex flex-row items-center justify-end gap-2 border-t border-border/50 px-4 sm:px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-11 sm:h-10 px-4 sm:px-3"
          >
            Annulla
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="h-11 sm:h-10 px-5 sm:px-4"
          >
            {totalJobs > 0 ? `Crea ${totalJobs} Operazioni` : "Salva"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
