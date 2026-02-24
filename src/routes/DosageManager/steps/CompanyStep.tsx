import { useMemo, type ReactElement } from "react";
import {
  MultiSearchableSelect,
  type MultiSearchableSelectOption,
} from "../MultiSearchableSelect";

interface CompanyStepProps {
  companies: { id: string; name: string }[];
  selectedCompanyIds: string[];
  onCompanyChange: (ids: string[]) => void;
}

export function CompanyStep({
  companies,
  selectedCompanyIds,
  onCompanyChange,
}: CompanyStepProps): ReactElement {
  const companyOptions = useMemo<MultiSearchableSelectOption[]>(
    () =>
      companies.map((company) => ({
        value: company.id,
        label: company.name,
      })),
    [companies],
  );

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg md:text-xl font-medium text-neutral-900">
          Seleziona Azienda
        </h2>
      </div>
      <div className="w-full max-w-md">
        <MultiSearchableSelect
          value={selectedCompanyIds}
          options={companyOptions}
          placeholder="Seleziona una o più aziende..."
          searchPlaceholder="Cerca azienda..."
          emptyMessage="Nessuna azienda trovata"
          onChange={onCompanyChange}
        />
      </div>
    </div>
  );
}
