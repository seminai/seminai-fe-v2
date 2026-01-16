import { Component, ChangeEvent, ReactNode } from "react";
import { Product } from "@/api/products";
import { stocksApiService, CreateStockPayload } from "@/api/stocks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface AddStockProps {
  product: Product;
  onStockCreated: () => void;
}

interface AddStockState {
  isDrawerOpen: boolean;
  isSubmitting: boolean;
  quantity: string;
  unit: string;
  type: "IN" | "OUT";
  price: string;
  priceUnit: string;
  jobId: string;
  ddtCode: string;
  invoiceCode: string;
  supplierName: string;
  supplierAddress: string;
  supplierVat: string;
}

class StockFormValidator {
  public static validateQuantity(quantity: number): string | null {
    if (!Number.isFinite(quantity) || quantity === 0) {
      return "La quantità deve essere diversa da zero";
    }
    return null;
  }

  public static validateUnit(unit: string): string | null {
    if (!unit || unit.trim().length === 0) {
      return "L'unità di misura è obbligatoria";
    }
    return null;
  }

  public static validateForm(data: {
    quantity: number;
    unit: string;
  }): string | null {
    const quantityError = this.validateQuantity(data.quantity);
    if (quantityError) {
      return quantityError;
    }

    const unitError = this.validateUnit(data.unit);
    if (unitError) {
      return unitError;
    }

    return null;
  }
}

class AddStock extends Component<AddStockProps, AddStockState> {
  public constructor(props: AddStockProps) {
    super(props);
    this.state = this.buildInitialState();
  }

  public componentDidUpdate(prevProps: Readonly<AddStockProps>): void {
    if (
      prevProps.product.id !== this.props.product.id &&
      !this.state.isDrawerOpen
    ) {
      this.setState(this.buildInitialState());
    }
  }

  private buildInitialState = (): AddStockState => ({
    isDrawerOpen: false,
    isSubmitting: false,
    quantity: "",
    unit: this.getDefaultUnit(),
    type: "IN",
    price: "",
    priceUnit: "EUR",
    jobId: "",
    ddtCode: "",
    invoiceCode: "",
    supplierName: "",
    supplierAddress: "",
    supplierVat: "",
  });

  private getDefaultUnit = (): string => {
    const firstStock = this.props.product.stocks[0];
    if (firstStock && firstStock.unitOfMeasureQuantity) {
      return firstStock.unitOfMeasureQuantity;
    }
    return "L";
  };

  private openDrawer = (): void => {
    const initialState = this.buildInitialState();
    this.setState({
      ...initialState,
      isDrawerOpen: true,
    });
  };

  private closeDrawer = (): void => {
    this.setState({ isDrawerOpen: false, isSubmitting: false });
  };

  private handleDrawerOpenChange = (open: boolean): void => {
    if (!open) {
      this.closeDrawer();
    }
  };

  private handleQuantityChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ quantity: event.target.value });
  };

  private handleUnitChange = (event: ChangeEvent<HTMLInputElement>): void => {
    this.setState({ unit: event.target.value });
  };

  private handlePriceChange = (event: ChangeEvent<HTMLInputElement>): void => {
    this.setState({ price: event.target.value });
  };

  private handlePriceUnitChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ priceUnit: event.target.value });
  };

  private handleJobIdChange = (event: ChangeEvent<HTMLInputElement>): void => {
    this.setState({ jobId: event.target.value });
  };

  private handleDdtCodeChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ ddtCode: event.target.value });
  };

  private handleInvoiceCodeChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ invoiceCode: event.target.value });
  };

  private handleSupplierNameChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ supplierName: event.target.value });
  };

  private handleSupplierAddressChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ supplierAddress: event.target.value });
  };

  private handleSupplierVatChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ supplierVat: event.target.value });
  };

  private handleTypeChange = (value: "IN" | "OUT"): void => {
    this.setState({ type: value });
  };

  private handleSubmit = async (): Promise<void> => {
    const quantityValue = Number.parseFloat(this.state.quantity);
    const validationError = StockFormValidator.validateForm({
      quantity: quantityValue,
      unit: this.state.unit,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    this.setState({ isSubmitting: true });

    try {
      const payload: CreateStockPayload = {
        companyId: this.props.product.warehouse.company.id,
        productId: this.props.product.id,
        quantity: Math.abs(quantityValue),
        unitOfMeasureQuantity: this.state.unit,
        type: this.state.type,
      };

      const priceValue = Number.parseFloat(this.state.price);
      if (Number.isFinite(priceValue) && priceValue > 0) {
        payload.price = priceValue;
        payload.unitOfMeasurePrice = this.state.priceUnit;
      }

      if (this.state.jobId) {
        payload.jobId = this.state.jobId;
      }
      if (this.state.ddtCode) {
        payload.ddtCode = this.state.ddtCode;
      }
      if (this.state.invoiceCode) {
        payload.invoiceCode = this.state.invoiceCode;
      }
      if (this.state.supplierName) {
        payload.companySupplierName = this.state.supplierName;
      }
      if (this.state.supplierAddress) {
        payload.addressSupplier = this.state.supplierAddress;
      }
      if (this.state.supplierVat) {
        payload.vatNumberSupplier = this.state.supplierVat;
      }

      await stocksApiService.create(payload);

      toast.success("Movimento di stock registrato con successo");
      this.closeDrawer();
      this.props.onStockCreated();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nella registrazione del movimento"
      );
    } finally {
      this.setState({ isSubmitting: false });
    }
  };

  public render(): ReactNode {
    return (
      <>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={this.openDrawer}
          className="bg-white hover:bg-white border-agri-green-600 text-black hover:text-black hover:border-agri-green-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Movimento
        </Button>

        <Sheet
          open={this.state.isDrawerOpen}
          onOpenChange={this.handleDrawerOpenChange}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-[50vw] overflow-y-auto bg-white p-6"
          >
            <SheetHeader>
              <SheetTitle>Nuovo Movimento</SheetTitle>
              <SheetDescription>
                Registra un nuovo movimento di carico o scarico per{" "}
                <strong>{this.props.product.name}</strong>
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 py-6">
              {/* Campi principali */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock-type">
                      Tipo <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={this.state.type}
                      onValueChange={this.handleTypeChange}
                    >
                      <SelectTrigger id="stock-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN">Carico (IN)</SelectItem>
                        <SelectItem value="OUT">Scarico (OUT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock-quantity">
                      Quantità <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="stock-quantity"
                      type="number"
                      step="0.01"
                      value={this.state.quantity}
                      onChange={this.handleQuantityChange}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock-unit">
                    Unità di Misura <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="stock-unit"
                    value={this.state.unit}
                    onChange={this.handleUnitChange}
                    placeholder="L, kg, pz..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock-price">Prezzo Unitario</Label>
                    <Input
                      id="stock-price"
                      type="number"
                      step="0.01"
                      value={this.state.price}
                      onChange={this.handlePriceChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock-price-unit">Valuta</Label>
                    <Input
                      id="stock-price-unit"
                      value={this.state.priceUnit}
                      onChange={this.handlePriceUnitChange}
                      placeholder="EUR"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Informazioni aggiuntive */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">
                  Informazioni Aggiuntive
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="stock-job-id">Job ID</Label>
                  <Input
                    id="stock-job-id"
                    value={this.state.jobId}
                    onChange={this.handleJobIdChange}
                    placeholder="ID del job associato"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock-ddt">Codice DDT</Label>
                    <Input
                      id="stock-ddt"
                      value={this.state.ddtCode}
                      onChange={this.handleDdtCodeChange}
                      placeholder="DDT-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock-invoice">Codice Fattura</Label>
                    <Input
                      id="stock-invoice"
                      value={this.state.invoiceCode}
                      onChange={this.handleInvoiceCodeChange}
                      placeholder="INV-001"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dati fornitore */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">
                  Dati Fornitore
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="stock-supplier-name">Nome Fornitore</Label>
                  <Input
                    id="stock-supplier-name"
                    value={this.state.supplierName}
                    onChange={this.handleSupplierNameChange}
                    placeholder="Nome dell'azienda fornitrice"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock-supplier-address">
                    Indirizzo Fornitore
                  </Label>
                  <Input
                    id="stock-supplier-address"
                    value={this.state.supplierAddress}
                    onChange={this.handleSupplierAddressChange}
                    placeholder="Via, Città"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock-supplier-vat">
                    Partita IVA Fornitore
                  </Label>
                  <Input
                    id="stock-supplier-vat"
                    value={this.state.supplierVat}
                    onChange={this.handleSupplierVatChange}
                    placeholder="IT00000000000"
                  />
                </div>
              </div>
            </div>

            <SheetFooter>
              <Button
                variant="outline"
                onClick={this.closeDrawer}
                disabled={this.state.isSubmitting}
              >
                Annulla
              </Button>
              <Button
                onClick={this.handleSubmit}
                disabled={this.state.isSubmitting}
              >
                {this.state.isSubmitting
                  ? "Registrazione..."
                  : "Registra Movimento"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </>
    );
  }
}

export default AddStock;
