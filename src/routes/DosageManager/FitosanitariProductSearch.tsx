import * as React from "react";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  getAuthorizedFitosanitariRecords,
  type FitosanitariDatasetRecord,
} from "@/services/fitosanitariRegistry";

interface FitosanitariProductSearchProps {
  onProductSelected: (record: FitosanitariDatasetRecord) => void;
  onCloseParentDrawer?: () => void;
  onOpenParentDrawer?: () => void;
}

interface FitosanitariProductSearchState {
  options: SearchableSelectOption[];
  registryMap: Map<string, FitosanitariDatasetRecord>;
  loading: boolean;
  selectedValue: string;
  errorMessage?: string;
}

export class FitosanitariProductSearch extends React.PureComponent<
  FitosanitariProductSearchProps,
  FitosanitariProductSearchState
> {
  private isMountedFlag = false;

  public state: FitosanitariProductSearchState = {
    options: [],
    registryMap: new Map<string, FitosanitariDatasetRecord>(),
    loading: false,
    selectedValue: "",
    errorMessage: undefined,
  };

  public componentDidMount(): void {
    this.isMountedFlag = true;
    void this.loadRegistry();
  }

  public componentWillUnmount(): void {
    this.isMountedFlag = false;
  }

  private async loadRegistry(): Promise<void> {
    this.setState({ loading: true, errorMessage: undefined });
    try {
      const records = await getAuthorizedFitosanitariRecords();
      const sortedRecords = [...records].sort((a, b) =>
        a.productName.localeCompare(b.productName),
      );
      const registryMap = new Map<string, FitosanitariDatasetRecord>();
      const options: SearchableSelectOption[] = sortedRecords.map((record) => {
        registryMap.set(record.registrationNumber, record);
        return {
          value: record.registrationNumber,
          label: `${record.productName} • ${record.registrationNumber}`,
          searchText: (record.activeIngredients ?? "").trim() || undefined,
        };
      });

      if (!this.isMountedFlag) {
        return;
      }

      this.setState({ options, registryMap });
    } catch (error) {
      if (!this.isMountedFlag) {
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load fitosanitari registry";
      this.setState({ errorMessage: message });
    } finally {
      if (this.isMountedFlag) {
        this.setState({ loading: false });
      }
    }
  }

  private handleSelection = (registrationNumber: string): void => {
    this.setState({ selectedValue: registrationNumber });
    if (!registrationNumber) {
      return;
    }
    const record = this.state.registryMap.get(registrationNumber);
    if (record) {
      this.props.onProductSelected(record);
    }
  };

  public render(): React.ReactNode {
    return (
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white/80 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-neutral-900">
            Compilazione automatica
          </p>
          <p className="text-xs text-neutral-500">
            Usa l'archivio fitosanitari autorizzati per precompilare i campi
            obbligatori.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-700">
            Prodotto
          </label>
          <SearchableSelect
            value={this.state.selectedValue}
            options={this.state.options}
            placeholder="Seleziona prodotto"
            searchPlaceholder="Cerca per nome, numero o principio attivo"
            emptyMessage="Nessun prodotto trovato"
            noneOptionLabel="Pulisci selezione"
            loading={this.state.loading}
            loadingMessage="Caricamento registro..."
            onChange={this.handleSelection}
            maxVisibleOptions={200}
          />
        </div>
        {this.state.errorMessage && (
          <p className="text-xs text-red-500">{this.state.errorMessage}</p>
        )}
      </div>
    );
  }
}
