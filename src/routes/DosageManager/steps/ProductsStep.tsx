import { useState, useCallback, useRef, type Dispatch, type ReactElement, type RefObject, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import {
  EditableTable,
  type EditableColumn,
  type EditableTableRef,
} from "@/components/organism/EditableTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardPaste,
  FileText,
  Loader2,
  Package,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { DosageProduct } from "@/api/dosage-agent";
import { ImportProducts } from "../importProducts";
import { ImportProductsFromDdt } from "../importProductsFromDdt";
import { FitosanitariProductSearch } from "../FitosanitariProductSearch";
import type { FitosanitariDatasetRecord } from "@/services/fitosanitariRegistry";
import { ImportMethodPolicy, type ImportMethod } from "../importMethod";

// Extended product type with internal ID for unique row identification
type ProductWithInternalId = DosageProduct & { _internalId: string };

interface ProductsStepProps {
  selectedCompanyIds: string[];
  products: ProductWithInternalId[];
  setProducts: Dispatch<SetStateAction<ProductWithInternalId[]>>;
  setSelectedProductIds: Dispatch<SetStateAction<string[]>>;
  setProductSources: Dispatch<
    SetStateAction<Map<string, "warehouse" | "csv" | "ddt" | "notes">>
  >;
  productColumns: EditableColumn[];
  productsAsRows: Array<Record<string, unknown>>;
  handleSaveProducts: (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => void;
  handleDeleteProducts: (rows: Array<Record<string, unknown>>) => void;
  handleProductSelectionChange: (rows: Array<Record<string, unknown>>) => void;
  handleAddRowsFromCsv: (rows: Array<Record<string, unknown>>) => void;
  handleAddRowsFromDdt: (rows: Array<Record<string, unknown>>) => void;
  handleImportFromWarehouse: () => void;
  handleImportFromNotes: () => void;
  isWarehouseProductsLoading: boolean;
  isImportingFromWarehouse: boolean;
  isImportingFromNotes: boolean;
  handleRegistryProductSelected: (record: FitosanitariDatasetRecord) => void;
  editableTableRef: RefObject<EditableTableRef | null>;
  renderEmptyProductsPlaceholder: () => ReactElement;
  totalAreaHa: number;
  selectedImportMethod: ImportMethod | null;
  onSelectImportMethod: (method: ImportMethod) => void;
  onResetImportMethod: () => void;
}

export function ProductsStep({
  selectedCompanyIds,
  products,
  setProducts,
  setSelectedProductIds,
  setProductSources,
  productColumns,
  productsAsRows,
  handleSaveProducts,
  handleDeleteProducts,
  handleProductSelectionChange,
  handleAddRowsFromCsv,
  handleAddRowsFromDdt,
  handleImportFromWarehouse,
  handleImportFromNotes,
  isWarehouseProductsLoading,
  isImportingFromWarehouse,
  isImportingFromNotes,
  handleRegistryProductSelected,
  editableTableRef,
  renderEmptyProductsPlaceholder,
  totalAreaHa,
  selectedImportMethod,
  onSelectImportMethod,
  onResetImportMethod,
}: ProductsStepProps): ReactElement {
  const [showAutomaticCompilation, setShowAutomaticCompilation] =
    useState(false);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // Counter for generating unique IDs for products imported from external sources
  const productIdCounterRef = useRef<number>(0);

  // Wrapper function to convert DosageProduct[] to ProductWithInternalId[]
  const handleProductsChange = (newProducts: DosageProduct[]): void => {
    const productsWithIds: ProductWithInternalId[] = newProducts.map(
      (product) => ({
        ...product,
        _internalId: `product-${Date.now()}-${++productIdCounterRef.current}`,
      }),
    );
    setProducts(productsWithIds);
  };

  const parseTsvToRows = useCallback(
    (text: string): Array<Record<string, unknown>> => {
      const COLUMN_KEYS = [
        "productName",
        "registrationNumber",
        "quantityUnitOfMeasure",
        "quantity",
        "targetStock",
        "supplierName",
        "supplierVat",
        "orderNumber",
        "ddtDate",
      ];
      const NUMBER_FIELDS = new Set(["quantity", "targetStock"]);

      return text
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const cells = line.split("\t");
          const row: Record<string, unknown> = { totalAreaHa: totalAreaHa };
          COLUMN_KEYS.forEach((key, i) => {
            const raw = cells[i]?.trim() ?? "";
            if (NUMBER_FIELDS.has(key)) {
              row[key] = Number(raw) || 0;
            } else {
              row[key] = raw;
            }
          });
          return row;
        })
        .filter((row) => row.productName);
    },
    [totalAreaHa],
  );

  const handlePasteConfirm = useCallback(() => {
    if (!pasteText.trim()) return;
    const rows = parseTsvToRows(pasteText);
    if (rows.length === 0) {
      toast.error("Nessun dato valido trovato", {
        description:
          "Verifica che i dati siano separati da tabulazione (copia da Excel).",
      });
      return;
    }
    editableTableRef.current?.addRows(rows);
    toast.success(`${rows.length} prodotti incollati`);
    setPasteText("");
    setPasteDialogOpen(false);
  }, [pasteText, parseTsvToRows, editableTableRef]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-medium text-neutral-900">
          Seleziona prodotti fitosanitari
        </h2>
        {products.length > 0 && (
          <p className="text-sm text-neutral-500 mt-1">
            {products.length} prodotti caricati
          </p>
        )}
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-6">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-neutral-900">
              Importa prodotti
            </p>
            <p className="text-sm text-neutral-500">
              Carica rapidamente i prodotti tramite CSV oppure leggi i DDT
              in formato PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {" "}
            {(!selectedImportMethod ||
              ImportMethodPolicy.isSelected(
                selectedImportMethod,
                "registry",
              )) && (
              <Button
                variant="outline"
                className="gap-2 bg-agri-green-500 text-white border-agri-green-500 hover:bg-agri-green-600 hover:text-white hover:border-agri-green-600"
                onClick={() => {
                  onSelectImportMethod("registry");
                  setShowAutomaticCompilation((prev) => !prev);
                }}
                disabled={
                  !!selectedImportMethod &&
                  !ImportMethodPolicy.isSelected(
                    selectedImportMethod,
                    "registry",
                  )
                }
              >
                <Upload className="h-4 w-4" />
                <span>Importa prodotti</span>
              </Button>
            )}{" "}
            {(!selectedImportMethod ||
              ImportMethodPolicy.isSelected(
                selectedImportMethod,
                "warehouse",
              )) && (
              <Button
                variant="outline"
                className="gap-2 bg-agri-green-500 text-white border-agri-green-500 hover:bg-agri-green-600 hover:text-white hover:border-agri-green-600"
                onClick={() => {
                  onSelectImportMethod("warehouse");
                  handleImportFromWarehouse();
                }}
                disabled={
                  isWarehouseProductsLoading ||
                  isImportingFromWarehouse ||
                  selectedCompanyIds.length === 0 ||
                  (!!selectedImportMethod &&
                    !ImportMethodPolicy.isSelected(
                      selectedImportMethod,
                      "warehouse",
                    ))
                }
                title={
                  selectedCompanyIds.length === 0
                    ? "Seleziona almeno un'azienda per importare da magazzino"
                    : selectedCompanyIds.length > 1
                      ? `Importa prodotti da ${selectedCompanyIds.length} aziende selezionate`
                      : "Importa prodotti dal magazzino dell'azienda selezionata"
                }
              >
                {isWarehouseProductsLoading || isImportingFromWarehouse ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      {isImportingFromWarehouse
                        ? "Importazione in corso..."
                        : "Caricamento..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    <span>
                      Importa da magazzino
                      {selectedCompanyIds.length > 1
                        ? ` (${selectedCompanyIds.length} aziende)`
                        : ""}
                    </span>
                  </>
                )}
              </Button>
            )}
            {(!selectedImportMethod ||
              ImportMethodPolicy.isSelected(
                selectedImportMethod,
                "notes",
              )) && (
              <Button
                variant="outline"
                className="gap-2 bg-agri-green-500 text-white border-agri-green-500 hover:bg-agri-green-600 hover:text-white hover:border-agri-green-600"
                onClick={() => {
                  onSelectImportMethod("notes");
                  handleImportFromNotes();
                }}
                disabled={
                  isImportingFromNotes ||
                  selectedCompanyIds.length === 0 ||
                  (!!selectedImportMethod &&
                    !ImportMethodPolicy.isSelected(
                      selectedImportMethod,
                      "notes",
                    ))
                }
                title={
                  selectedCompanyIds.length === 0
                    ? "Seleziona almeno un'azienda per importare da note"
                    : selectedCompanyIds.length > 1
                      ? `Importa prodotti da note per ${selectedCompanyIds.length} aziende selezionate`
                      : "Importa prodotti fitosanitari verificati dall'azienda selezionata"
                }
              >
                {isImportingFromNotes ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Importazione in corso...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    <span>
                      Importa da note
                      {selectedCompanyIds.length > 1
                        ? ` (${selectedCompanyIds.length} aziende)`
                        : ""}
                    </span>
                  </>
                )}
              </Button>
            )}
            {(!selectedImportMethod ||
              ImportMethodPolicy.isSelected(
                selectedImportMethod,
                "csv",
              )) && (
              <ImportProducts
                onAddRows={handleAddRowsFromCsv}
                onProductsChange={handleProductsChange}
                disabled={
                  !!selectedImportMethod &&
                  !ImportMethodPolicy.isSelected(
                    selectedImportMethod,
                    "csv",
                  )
                }
                onSelectImportMethod={() => onSelectImportMethod("csv")}
              />
            )}
            {(!selectedImportMethod ||
              ImportMethodPolicy.isSelected(
                selectedImportMethod,
                "ddt",
              )) && (
              <ImportProductsFromDdt
                onAddRows={handleAddRowsFromDdt}
                onProductsChange={handleProductsChange}
                disabled={
                  !!selectedImportMethod &&
                  !ImportMethodPolicy.isSelected(
                    selectedImportMethod,
                    "ddt",
                  )
                }
                onSelectImportMethod={() => onSelectImportMethod("ddt")}
              />
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setPasteDialogOpen(true)}
            >
              <ClipboardPaste className="h-4 w-4" />
              <span>Incolla da Excel</span>
            </Button>
            {selectedImportMethod && (
              <Button
                variant="ghost"
                className="gap-2 text-neutral-600 hover:text-neutral-900"
                onClick={() => {
                  onResetImportMethod();
                  setShowAutomaticCompilation(false);
                  setProducts([]);
                  setSelectedProductIds([]);
                  setProductSources(new Map());
                }}
              >
                <X className="h-4 w-4" />
                <span>
                  Reset ({ImportMethodPolicy.label(selectedImportMethod)})
                </span>
              </Button>
            )}
          </div>

          {showAutomaticCompilation && (
            <FitosanitariProductSearch
              onProductSelected={handleRegistryProductSelected}
            />
          )}
        </div>

        <EditableTable
          ref={editableTableRef}
          columns={productColumns}
          rows={productsAsRows}
          isModify={true}
          addButton={true}
          createMode="drawer"
          newRowDefaults={{
            totalAreaHa,
            quantityPerHectare: "",
          }}
          createDrawerFormDescription={
            totalAreaHa === 0
              ? "Seleziona le unità produttive sopra per calcolare automaticamente la quantità da quantità per ettaro."
              : undefined
          }
          onSave={handleSaveProducts}
          onDeleteSelected={handleDeleteProducts}
          onSelectionChange={handleProductSelectionChange}
          showDeleteAction={true}
          getRowId={(row: Record<string, unknown>, index: number) => {
            const internalId = row._internalId as string | undefined;
            if (internalId) {
              return internalId;
            }
            return `${row.productName}-${row.registrationNumber}-${index}`;
          }}
          exportFileName="prodotti_dosaggio"
        />
      </div>
      {products.length === 0 && renderEmptyProductsPlaceholder()}

      <Dialog
        open={pasteDialogOpen}
        onOpenChange={(open) => {
          setPasteDialogOpen(open);
          if (!open) setPasteText("");
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardPaste className="h-5 w-5" />
              Incolla da Excel
            </DialogTitle>
            <DialogDescription>
              Copia le righe da Excel e incollale qui sotto. L'ordine delle
              colonne deve essere: Nome Prodotto, N. Registrazione, Unità,
              Quantità, Giacenza, Fornitore, P.IVA, Codice DDT, Data DDT.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Incolla qui i dati copiati da Excel (Ctrl+V / Cmd+V)..."
            className="min-h-40 font-mono text-xs"
          />
          {pasteText.trim() && (
            <p className="text-xs text-neutral-500">
              {parseTsvToRows(pasteText).length} righe valide trovate
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasteDialogOpen(false);
                setPasteText("");
              }}
            >
              Annulla
            </Button>
            <Button
              onClick={handlePasteConfirm}
              disabled={!pasteText.trim()}
            >
              Importa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
