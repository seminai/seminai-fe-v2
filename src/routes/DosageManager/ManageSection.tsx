import type {
  ChangeEvent,
  ReactElement,
  RefObject,
  Dispatch,
  SetStateAction,
} from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EditableTable, type EditableColumn } from "@/components/organism/EditableTable";
import { Loader2, Package } from "lucide-react";
import { type DosageStrategy, type DosageProduct } from "@/api/dosage-agent";
import { ImportProducts } from "./importProducts";
import { ImportProductsFromDdt } from "./importProductsFromDdt";
import { FitosanitariProductSearch } from "./FitosanitariProductSearch";
import type { ProductionUnit } from "@/api/production-unit";
import { type FitosanitariDatasetRecord } from "@/services/fitosanitariRegistry";

interface ManageSectionProps {
  companies: { id: string; name: string }[];
  selectedCompanyId: string;
  setSelectedCompanyId: Dispatch<SetStateAction<string>>;
  selectedUnitIds: string[];
  setSelectedUnitIds: Dispatch<SetStateAction<string[]>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  loadingUnits: boolean;
  filteredUnits: ProductionUnit[];
  productionUnitTableColumns: EditableColumn[];
  productionUnitTableRows: Array<Record<string, unknown>>;
  handleUnitSelectionChange: (rows: Array<Record<string, unknown>>) => void;
  products: DosageProduct[];
  setProducts: Dispatch<SetStateAction<DosageProduct[]>>;
  setProductSources: Dispatch<
    SetStateAction<Map<string, "warehouse" | "csv" | "ddt">>
  >;
  productColumns: EditableColumn[];
  productsAsRows: Array<Record<string, unknown>>;
  handleSaveProducts: (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => void;
  handleDeleteProducts: (removed: Array<Record<string, unknown>>) => void;
  handleAddRowsFromCsv: (rows: Array<Record<string, unknown>>) => void;
  handleAddRowsFromDdt: (rows: Array<Record<string, unknown>>) => void;
  handleImportFromWarehouse: () => void;
  isWarehouseProductsLoading: boolean;
  handleRegistryProductSelected: (record: FitosanitariDatasetRecord) => void;
  renderProductLabelAction: (row: Record<string, unknown>) => ReactElement;
  editableTableRef: RefObject<EditableTable | null>;
  strategy: DosageStrategy;
  setStrategy: Dispatch<SetStateAction<DosageStrategy>>;
  strategyOptions: Array<{ value: DosageStrategy; label: string; description: string }>;
  selectedStrategyOption: { value: DosageStrategy; label: string; description: string };
  outStockLimiter: boolean;
  setOutStockLimiter: Dispatch<SetStateAction<boolean>>;
  renderEmptyProductsPlaceholder: () => ReactElement;
}

export function ManageSection({
  companies,
  selectedCompanyId,
  setSelectedCompanyId,
  setSelectedUnitIds,
  searchQuery,
  setSearchQuery,
  loadingUnits,
  filteredUnits,
  productionUnitTableColumns,
  productionUnitTableRows,
  handleUnitSelectionChange,
  products,
  setProducts,
  setProductSources,
  productColumns,
  productsAsRows,
  handleSaveProducts,
  handleDeleteProducts,
  handleAddRowsFromCsv,
  handleAddRowsFromDdt,
  handleImportFromWarehouse,
  isWarehouseProductsLoading,
  handleRegistryProductSelected,
  renderProductLabelAction,
  editableTableRef,
  strategy,
  setStrategy,
  strategyOptions,
  selectedStrategyOption,
  outStockLimiter,
  setOutStockLimiter,
  renderEmptyProductsPlaceholder,
}: ManageSectionProps): ReactElement {
  return (
    <div className="mx-auto space-y-8 md:space-y-12">
      {/* Company Filter Section */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg md:text-xl font-medium text-neutral-900">Seleziona Azienda</h2>
        </div>
        <Select
          value={selectedCompanyId}
          onValueChange={(value) => {
            setSelectedCompanyId(value);
            setSelectedUnitIds([]);
            setSearchQuery("");
            // Reset prodotti e sorgenti quando cambia azienda
            setProducts([]);
            setProductSources(new Map());
            // Reset strategia e outStockLimiter ai valori di default
            setStrategy("avg");
            setOutStockLimiter(true);
          }}
        >
          <SelectTrigger className="w-full max-w-md h-12 bg-neutral-50 border-neutral-200">
            <SelectValue placeholder="Scegli un'azienda" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Units Section */}
      {selectedCompanyId && (
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-medium text-neutral-900">Seleziona Unità Produttive</h2>
              {filteredUnits.length > 0 && (
                <p className="text-sm text-neutral-500 mt-1">{filteredUnits.length} disponibili</p>
              )}
            </div>
            <div className="w-full lg:w-auto">
              <Input
                value={searchQuery}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
                placeholder="Cerca per nome, coltura o varietà"
                aria-label="Cerca unità produttive"
                disabled={loadingUnits}
                className="bg-white"
              />
            </div>
          </div>

          {loadingUnits ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              {searchQuery ? "Nessuna unità trovata" : "Nessuna unità disponibile per questa azienda"}
            </div>
          ) : (
            <EditableTable
              columns={productionUnitTableColumns}
              rows={productionUnitTableRows}
              isModify={false}
              addButton={false}
              onSelectionChange={handleUnitSelectionChange}
              showDeleteAction={false}
              getRowId={(row) => (row as { id: string }).id}
              className="bg-white rounded-2xl border border-neutral-200"
            />
          )}
        </div>
      )}

      {/* Products Section */}
      <div className="space-y-4 md:space-y-6 relative">
        {!selectedCompanyId && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
            <div className="text-center p-6">
              <p className="text-base font-medium text-neutral-700 mb-2">Seleziona prima un'azienda</p>
              <p className="text-sm text-neutral-500">
                Per selezionare i prodotti fitosanitari, devi prima scegliere un'azienda nella sezione sopra.
              </p>
            </div>
          </div>
        )}
        <div className={selectedCompanyId ? "" : "pointer-events-none opacity-50"}>
          <div>
            <h2 className="text-lg md:text-xl font-medium text-neutral-900">Seleziona prodotti fitosanitari</h2>
            {products.length > 0 && (
              <p className="text-sm text-neutral-500 mt-1">{products.length} prodotti caricati</p>
            )}
          </div>
          <EditableTable
            ref={editableTableRef}
            columns={productColumns}
            rows={productsAsRows}
            isModify={true}
            addButton={true}
            onSave={handleSaveProducts}
            onDeleteSelected={handleDeleteProducts}
            getRowId={(row, index) => `${row.productName}-${row.registrationNumber}-${index}`}
            lastComponent={renderProductLabelAction}
          >
            <div
              data-editable-table-slot="create-drawer"
              className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-6"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-900">Importa prodotti</p>
                <p className="text-sm text-neutral-500">
                  Carica rapidamente i prodotti tramite CSV oppure leggi i DDT in formato PDF.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ImportProducts onAddRows={handleAddRowsFromCsv} onProductsChange={setProducts} />
                <ImportProductsFromDdt onAddRows={handleAddRowsFromDdt} onProductsChange={setProducts} />
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleImportFromWarehouse}
                  disabled={isWarehouseProductsLoading || !selectedCompanyId}
                >
                  {isWarehouseProductsLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Importazione...</span>
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      <span>Importa da magazzino</span>
                    </>
                  )}
                </Button>
              </div>
              <FitosanitariProductSearch onProductSelected={handleRegistryProductSelected} />
            </div>
          </EditableTable>
          {products.length === 0 && renderEmptyProductsPlaceholder()}
        </div>
      </div>

      {/* Strategy Section */}
      <div className="space-y-6 relative">
        {!selectedCompanyId && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
            <div className="text-center p-6">
              <p className="text-base font-medium text-neutral-700 mb-2">Seleziona prima un'azienda</p>
              <p className="text-sm text-neutral-500">
                Per selezionare la strategia di calcolo, devi prima scegliere un'azienda nella sezione sopra.
              </p>
            </div>
          </div>
        )}
        <div
          className={
            selectedCompanyId
              ? "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between w-full"
              : "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between w-full pointer-events-none opacity-50"
          }
        >
          <div>
            <h2 className="text-lg md:text-xl font-medium text-neutral-900">Seleziona la strategia di calcolo dosaggi</h2>
            <p className="text-sm text-neutral-500 mt-1">{selectedStrategyOption.description}</p>
          </div>
          <Select
            value={strategy}
            onValueChange={(value) => setStrategy(value as DosageStrategy)}
            disabled={!selectedCompanyId}
          >
            <SelectTrigger className="w-full max-w-sm h-12 bg-white border-neutral-200">
              <SelectValue placeholder="Seleziona una strategia" />
            </SelectTrigger>
            <SelectContent>
              {strategyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Out Stock Limiter Section */}
        <div
          className={
            selectedCompanyId
              ? "rounded-2xl border border-neutral-200 bg-white p-4 md:p-6 space-y-3"
              : "rounded-2xl border border-neutral-200 bg-white p-4 md:p-6 space-y-3 pointer-events-none opacity-50"
          }
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id="outStockLimiter"
              checked={outStockLimiter}
              onCheckedChange={(checked) => setOutStockLimiter(checked === true)}
              disabled={!selectedCompanyId}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="outStockLimiter" className="text-base font-medium text-neutral-900 cursor-pointer">
                {outStockLimiter ? "Protezione stock magazzino (attiva)" : "Protezione stock magazzino (disattiva)"}
              </Label>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {outStockLimiter
                  ? "Il sistema tutela lo stock caricato, evitando di andare sotto le quantità disponibili in magazzino."
                  : "Il sistema esegue un calcolo preciso dei dosaggi, permettendo di andare anche sotto le quantità disponibili in magazzino."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

