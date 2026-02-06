import * as React from "react";
import { type Company } from "@/api/companies";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";

interface CompanySearchSelectProps {
  companies: Company[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

class CompanySearchOptionsFactory {
  private readonly companies: Company[];

  constructor(companies: Company[]) {
    this.companies = companies;
  }

  public build(): SearchableSelectOption[] {
    return this.companies.map((company) => ({
      label: company.name,
      value: company.id,
    }));
  }
}

export function CompanySearchSelect({
  companies,
  value,
  onChange,
  disabled = false,
  isLoading = false,
}: CompanySearchSelectProps): React.ReactElement {
  const options = React.useMemo(() => {
    return new CompanySearchOptionsFactory(companies).build();
  }, [companies]);

  return (
    <SearchableSelect
      value={value}
      options={options}
      placeholder="Seleziona un'azienda"
      searchPlaceholder="Cerca azienda..."
      emptyMessage="Nessuna azienda trovata"
      loading={isLoading}
      loadingMessage="Caricamento aziende..."
      disabled={disabled}
      onChange={onChange}
    />
  );
}
