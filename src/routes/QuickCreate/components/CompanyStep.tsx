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

  const companyOptions = React.useMemo(
    () =>
      companies.companies.map((c) => ({
        label: c.name,
        value: c.id,
      })),
    [companies.companies],
  );

  const handleCreateCompany = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCompanyName.trim() || !newCompanyFiscalCode.trim()) return;

      const name = newCompanyName.trim();
      const fiscalCode = newCompanyFiscalCode.trim();

      try {
        const response = await companies.createCompaniesAsync([
          {
            name,
            fiscalCode,
            vatNumber: newCompanyVatNumber.trim() || "",
            cuaa: newCompanyCuaa.trim() || null,
          },
        ]);

        // Extract the created company ID from the response
        let createdId = response?.data?.companies?.[0]?.id;

        // Fallback: if the response didn't include the ID,
        // refetch and find by fiscalCode or name
        if (!createdId) {
          const refreshed = await companies.refetch();
          const found = refreshed.data?.data?.companies?.find(
            (c) => c.fiscalCode === fiscalCode || c.name === name,
          );
          if (found?.id) {
            createdId = found.id;
          }
        }

        if (createdId) {
          actions.setSelectedCompanyId(createdId);
        }

        // Close the form and reset fields — user stays on step 0
        // and sees the new company selected in the dropdown
        setShowCreateForm(false);
        setNewCompanyName("");
        setNewCompanyVatNumber("");
        setNewCompanyFiscalCode("");
        setNewCompanyCuaa("");
      } catch {
        // Error toast is already handled in useCompanies.
      }
    },
    [
      actions,
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
              variant="default"
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
                  <Label htmlFor="new-company-vat-number">Partita IVA *</Label>
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
