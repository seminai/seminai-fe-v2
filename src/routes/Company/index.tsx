import * as React from "react";
import { useState, useMemo, useRef } from "react";
import {
  type Company,
  type BulkCompanyInput,
  type BulkCompanyUpdateInput,
} from "@/api/companies";
import { Spinner } from "@/components/ui/spinner";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { createTextSearch } from "@/utils/filter";
import { DrawerCompanyContent } from "./DrawerCompany";
import { ImportCompanyByPdf } from "./ImportCompanyByPdf";
import { useCompanies } from "@/hooks/useCompanies";
import { toast } from "sonner";
import { PageHeader } from "@/components/organism/Header";

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
      id: "cuaa",
      title: "CUAA",
      type: "text",
      placeholder: "es. 12345678901",
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
  const tableRef = useRef<EditableTable>(null);

  const { companies, isLoading, error, createCompanies, updateCompanies } =
    useCompanies();

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

  /**
   * Gestisce l'importazione delle aziende da PDF
   * Aggiunge le aziende come nuove righe nella tabella editabile
   */
  const handleImportFromPdf = (companiesToImport: BulkCompanyInput[]): void => {
    if (!tableRef.current) {
      toast.error("Tabella non disponibile");
      return;
    }

    // Converti le aziende in formato row per la tabella
    const rowsToAdd = companiesToImport.map((company) => ({
      name: company.name || "",
      vatNumber: company.vatNumber || "",
      fiscalCode: company.fiscalCode || "",
      cuaa: company.cuaa || "",
      nation: company.nation || "",
      city: company.city || "",
      address: company.address || "",
      cap: company.cap || "",
      email: company.email || "",
      phoneNumber: company.phoneNumber || "",
      website: company.website || "",
      logoUrl: company.logoUrl || "",
    }));

    // Aggiungi le righe alla tabella
    tableRef.current.addRows(rowsToAdd);

    toast.success(
      `${companiesToImport.length} aziend${
        companiesToImport.length === 1 ? "a aggiunta" : "e aggiunte"
      } alla tabella. Completa i dati e salva.`
    );
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

      if (company.cuaa) bulkCompany.cuaa = String(company.cuaa);
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

    const companiesToUpdate = payload.updated.map((company) => {
      const updateCompany: Record<string, unknown> = {
        id: String(company.id),
      };

      if (company.name) updateCompany.name = String(company.name);
      if (company.vatNumber)
        updateCompany.vatNumber = String(company.vatNumber);
      if (company.fiscalCode)
        updateCompany.fiscalCode = String(company.fiscalCode);
      if (company.cuaa) updateCompany.cuaa = String(company.cuaa);
      if (company.nation) updateCompany.nation = String(company.nation);
      if (company.city) updateCompany.city = String(company.city);
      if (company.address) updateCompany.address = String(company.address);
      if (company.cap) updateCompany.cap = String(company.cap);
      if (company.email) updateCompany.email = String(company.email);
      if (company.phoneNumber)
        updateCompany.phoneNumber = String(company.phoneNumber);
      if (company.website) updateCompany.website = String(company.website);
      if (company.logoUrl) updateCompany.logoUrl = String(company.logoUrl);

      return updateCompany;
    });

    if (companiesToCreate.length === 0 && companiesToUpdate.length === 0) {
      toast.error("Nessuna modifica da salvare");
      return;
    }

    if (companiesToCreate.length > 0) {
      createCompanies(companiesToCreate);
    }

    if (companiesToUpdate.length > 0) {
      updateCompanies(companiesToUpdate as BulkCompanyUpdateInput[]);
    }
  };

  // Colonne unificate per view e edit
  const columns = buildCompaniesEditColumns();

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Aziende"
        searchPlaceholder="Cerca per nome, P.IVA, codice fiscale, città o email..."
        searchValue={searchFilter}
        onSearchChange={setSearchFilter}
        totalItems={companies.length}
        filteredItems={filteredItems.length}
        rightElement={<ImportCompanyByPdf onImportSuccess={handleImportFromPdf} />}
      />

      {/* Area scrollabile - solo la tabella */}
      <div className="flex-1 overflow-auto px-6 pb-6">
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
            ref={tableRef}
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
              cuaa: "",
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
    </div>
  );
}
