import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { IoAddCircleOutline } from "react-icons/io5";
import type { UseQuickCreateWizardReturn } from "../hooks/useQuickCreateWizard";

interface CompanyStepProps {
  wizard: UseQuickCreateWizardReturn;
}

export default function CompanyStep({
  wizard,
}: CompanyStepProps): React.ReactElement {
  const { state, actions, companies } = wizard;

  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newCompanyName, setNewCompanyName] = React.useState("");
  const [newCompanyVatNumber, setNewCompanyVatNumber] = React.useState("");
  const [newCompanyFiscalCode, setNewCompanyFiscalCode] = React.useState("");
  const [newCompanyCuaa, setNewCompanyCuaa] = React.useState("");
  // Track fiscal code of newly created company to auto-select after refetch
  const [pendingFiscalCode, setPendingFiscalCode] = React.useState<
    string | null
  >(null);

  const companyOptions = React.useMemo(
    () =>
      companies.companies.map((c) => ({
        label: c.name,
        value: c.id,
      })),
    [companies.companies],
  );

  // Auto-select newly created company after the companies list refetches
  React.useEffect(() => {
    if (pendingFiscalCode && companies.companies.length > 0) {
      const found = companies.companies.find(
        (c) => c.fiscalCode === pendingFiscalCode,
      );
      if (found) {
        actions.setSelectedCompanyId(found.id);
        setPendingFiscalCode(null);
        setShowCreateForm(false);
        setNewCompanyName("");
        setNewCompanyVatNumber("");
        setNewCompanyFiscalCode("");
        setNewCompanyCuaa("");
      }
    }
  }, [pendingFiscalCode, companies.companies, actions]);

  const handleCreateCompany = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (newCompanyName.trim() && newCompanyFiscalCode.trim()) {
        const fiscalCode = newCompanyFiscalCode.trim();
        setPendingFiscalCode(fiscalCode);
        companies.createCompanies([
          {
            name: newCompanyName.trim(),
            fiscalCode,
            vatNumber: newCompanyVatNumber.trim() || "",
            cuaa: newCompanyCuaa.trim() || null,
          },
        ]);
      }
    },
    [
      newCompanyName,
      newCompanyFiscalCode,
      newCompanyVatNumber,
      newCompanyCuaa,
      companies,
    ],
  );

  const handleToggleCreateForm = React.useCallback(() => {
    setShowCreateForm((prev) => !prev);
    if (showCreateForm) {
      setNewCompanyName("");
      setNewCompanyVatNumber("");
      setNewCompanyFiscalCode("");
      setNewCompanyCuaa("");
    }
  }, [showCreateForm]);

  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <h2 className="text-2xl font-semibold text-neutral-800 mb-2">
        Seleziona Azienda
      </h2>
      <p className="text-neutral-500 mb-8 text-center max-w-lg">
        Seleziona un'azienda esistente oppure creane una nuova.
      </p>

      <div className="w-full max-w-md space-y-6">
        {/* Company Selection */}
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="company-select" className="mb-2 block">
                Azienda
              </Label>
              <SearchableSelect
                value={state.selectedCompanyId}
                options={companyOptions}
                placeholder="Seleziona un'azienda (opzionale)"
                searchPlaceholder="Cerca azienda..."
                emptyMessage="Nessuna azienda trovata"
                noneOptionLabel="Nessuna selezione"
                loading={companies.isLoading}
                loadingMessage="Caricamento aziende..."
                onChange={actions.setSelectedCompanyId}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="default"
              className="h-10 shrink-0 gap-2"
              onClick={handleToggleCreateForm}
              title="Aggiungi nuova azienda"
            >
              <IoAddCircleOutline className="w-5 h-5" />
              Aggiungi nuova azienda
            </Button>
          </div>

          {/* Create Company Form */}
          {showCreateForm && (
            <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200 space-y-4">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">
                Crea Nuova Azienda
              </h3>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-company-name">Nome Azienda *</Label>
                  <Input
                    id="new-company-name"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Nome dell'azienda"
                    required
                    disabled={companies.isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-company-fiscal-code">
                    Codice Fiscale *
                  </Label>
                  <Input
                    id="new-company-fiscal-code"
                    value={newCompanyFiscalCode}
                    onChange={(e) => setNewCompanyFiscalCode(e.target.value)}
                    placeholder="Codice fiscale"
                    required
                    disabled={companies.isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-company-vat-number">Partita IVA</Label>
                  <Input
                    id="new-company-vat-number"
                    value={newCompanyVatNumber}
                    onChange={(e) => setNewCompanyVatNumber(e.target.value)}
                    placeholder="Partita IVA"
                    disabled={companies.isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-company-cuaa">CUAA</Label>
                  <Input
                    id="new-company-cuaa"
                    value={newCompanyCuaa}
                    onChange={(e) => setNewCompanyCuaa(e.target.value)}
                    placeholder="CUAA"
                    disabled={companies.isCreating}
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleToggleCreateForm}
                    disabled={companies.isCreating}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      companies.isCreating ||
                      !newCompanyName.trim() ||
                      !newCompanyFiscalCode.trim()
                    }
                  >
                    {companies.isCreating ? (
                      <>
                        <Spinner size={16} className="mr-2" />
                        Creazione...
                      </>
                    ) : (
                      "Crea"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {state.error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
}
