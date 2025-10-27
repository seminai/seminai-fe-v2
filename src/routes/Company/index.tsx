import * as React from "react";
import { useState, useMemo } from "react";
import { type Company, type BulkCompanyInput } from "@/api/companies";
import { Spinner } from "@/components/ui/spinner";
import { EditableTable, type EditableColumn } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { createTextSearch } from "@/utils/filter";
import { DrawerCompanyContent } from "./DrawerCompany";
import { useCompanies } from "@/hooks/useCompanies";
import { toast } from "sonner";

const buildCompaniesEditColumns = (): EditableColumn[] => {
  return [
    {
      id: "name",
      title: "Nome Azienda",
      type: "text",
      required: true,
      placeholder: "es. Azienda Agricola Rossi",
    },
    {
      id: "vatNumber",
      title: "Partita IVA",
      type: "text",
      required: true,
      placeholder: "es. IT12345678901",
    },
    {
      id: "fiscalCode",
      title: "Codice Fiscale",
      type: "text",
      required: true,
      placeholder: "es. RSSMRA80A01H501Z",
    },
    {
      id: "nation",
      title: "Nazione",
      type: "text",
      placeholder: "es. IT",
    },
    {
      id: "city",
      title: "Città",
      type: "text",
      placeholder: "es. Torino",
    },
    {
      id: "address",
      title: "Indirizzo",
      type: "text",
      placeholder: "es. Via Roma 1",
    },
    {
      id: "cap",
      title: "CAP",
      type: "text",
      placeholder: "es. 10100",
    },
    {
      id: "email",
      title: "Email",
      type: "text",
      placeholder: "es. info@azienda.it",
    },
    {
      id: "phoneNumber",
      title: "Telefono",
      type: "text",
      placeholder: "es. +39 011 1234567",
    },
    {
      id: "website",
      title: "Sito Web",
      type: "text",
      placeholder: "es. https://www.azienda.it",
    },
    {
      id: "logoUrl",
      title: "URL Logo",
      type: "text",
      placeholder: "es. https://cdn.example.com/logo.png",
    },
  ];
};

export default function Company(): React.ReactElement {
  const [searchFilter, setSearchFilter] = useState<string>("");

  const { companies, isLoading, error, createCompanies } = useCompanies();

  const textSearch = useMemo(
    () =>
      createTextSearch<Company>([
        "name",
        "vatNumber",
        "fiscalCode",
        "city",
        "email",
      ]),
    []
  );

  const filteredItems = useMemo(() => {
    return textSearch.setSearchTerm(searchFilter).filter(companies);
  }, [companies, searchFilter, textSearch]);

  const renderDetails = (row: Record<string, unknown>): React.ReactNode => {
    const company = row as unknown as Company;
    return <DrawerCompanyContent company={company} />;
  };

  const handleSave = (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => {
    const companiesToCreate = payload.created.map((company) => {
      const bulkCompany: BulkCompanyInput = {
        name: String(company.name || ""),
        vatNumber: String(company.vatNumber || ""),
        fiscalCode: String(company.fiscalCode || ""),
      };

      if (company.nation) bulkCompany.nation = String(company.nation);
      if (company.city) bulkCompany.city = String(company.city);
      if (company.address) bulkCompany.address = String(company.address);
      if (company.cap) bulkCompany.cap = String(company.cap);
      if (company.email) bulkCompany.email = String(company.email);
      if (company.phoneNumber)
        bulkCompany.phoneNumber = String(company.phoneNumber);
      if (company.website) bulkCompany.website = String(company.website);
      if (company.logoUrl) bulkCompany.logoUrl = String(company.logoUrl);

      return bulkCompany;
    });

    if (companiesToCreate.length === 0) {
      toast.error("Aggiungi almeno un'azienda");
      return;
    }

    createCompanies(companiesToCreate);
  };

  // Colonne unificate per view e edit
  const columns = buildCompaniesEditColumns();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Aziende</h1>
      </div>

      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Cerca per nome, P.IVA, codice fiscale, città o email..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchFilter && (
          <p className="text-xs text-gray-500 mt-2">
            {filteredItems.length} risultat
            {filteredItems.length === 1 ? "o" : "i"} su {companies.length}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size={20} ariaLabel="Caricamento aziende" />
          <span>Caricamento aziende…</span>
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">
          Impossibile caricare le aziende. Errore:{" "}
          {error instanceof Error ? error.message : "Errore sconosciuto"}
        </div>
      ) : (
        <EditableTable
          columns={columns}
          rows={filteredItems}
          isModify={true}
          addButton={true}
          getRowId={(row, index) =>
            (typeof row.id === "string" && row.id) || index
          }
          onSave={handleSave}
          newRowDefaults={{
            name: "",
            vatNumber: "",
            fiscalCode: "",
            nation: "",
            city: "",
            address: "",
            cap: "",
            email: "",
            phoneNumber: "",
            website: "",
            logoUrl: "",
          }}
          detailsRenderer={renderDetails}
          detailsTitle="Dettagli Azienda"
          className="bg-background"
        />
      )}
    </div>
  );
}
