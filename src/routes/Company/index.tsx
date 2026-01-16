import * as React from "react";
import { useRef } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import {
  type Company,
  type BulkCompanyInput,
  type BulkCompanyUpdateInput,
} from "@/api/companies";
import { Spinner } from "@/components/ui/spinner";
import {
  EditableTable,
  type EditableColumn,
  type EditableTableRef,
} from "@/components/organism/EditableTable";
import { DrawerCompanyContent } from "./DrawerCompany";
import { ImportCompanyByPdf } from "./ImportCompanyByPdf";
import { useCompanies } from "@/hooks/useCompanies";
import { toast } from "sonner";
import { PageHeader } from "@/components/organism/Header";

class CompanyDetailsNavigator {
  private readonly navigate: NavigateFunction;

  public constructor(navigate: NavigateFunction) {
    this.navigate = navigate;
  }

  public open(row: Record<string, unknown>): void {
    const id = this.extractId(row);
    if (!id) {
      return;
    }
    this.navigate(`/company/${id}`);
  }

  private extractId(row: Record<string, unknown>): string | null {
    const rawId = row.id;
    if (typeof rawId === "string") {
      return rawId;
    }
    if (typeof rawId === "number") {
      return String(rawId);
    }
    return null;
  }
}

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
      placeholder: "es. get.seminai@gmail.com",
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
  const tableRef = useRef<EditableTableRef>(null);
  const navigate = useNavigate();
  const detailsNavigator = React.useMemo(
    () => new CompanyDetailsNavigator(navigate),
    [navigate]
  );

  const {
    companies,
    isLoading,
    error,
    createCompanies,
    updateCompanies,
    isUpdating,
  } = useCompanies();

  const renderDetails = (row: Record<string, unknown>): React.ReactNode => {
    const companyId = typeof row.id === "string" ? row.id : String(row.id);

    // Trova sempre l'azienda più recente dalla lista aggiornata
    const company =
      companies.find((c) => c.id === companyId) || (row as unknown as Company);

    const handleUpdate = (update: BulkCompanyUpdateInput): void => {
      updateCompanies([update]);
    };

    // Usa updatedAt come key per forzare il re-render quando i dati cambiano
    const key = `${company.id}-${company.updatedAt || Date.now()}`;

    return (
      <DrawerCompanyContent
        key={key}
        company={company}
        onUpdate={handleUpdate}
        isUpdating={isUpdating}
      />
    );
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

    const firstCompany = companiesToImport[0];
    if (!firstCompany) {
      toast.error("Nessun dato importato dal PDF");
      return;
    }

    tableRef.current.prefillCreateRow({
      name: firstCompany.name || "",
      vatNumber: firstCompany.vatNumber || "",
      fiscalCode: firstCompany.fiscalCode || "",
      cuaa: firstCompany.cuaa || "",
      nation: firstCompany.nation || "",
      city: firstCompany.city || "",
      address: firstCompany.address || "",
      cap: firstCompany.cap || "",
      email: firstCompany.email || "",
      phoneNumber: firstCompany.phoneNumber || "",
      website: firstCompany.website || "",
      logoUrl: firstCompany.logoUrl || "",
    });

    toast.success("Dati importati nel form. Verifica e salva l'azienda.");
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
  const handleOpenDetails = React.useCallback(
    (row: Record<string, unknown>): void => {
      detailsNavigator.open(row);
    },
    [detailsNavigator]
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Aziende" />

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
            rows={companies}
            isModify={true}
            addButton={true}
            getRowId={(row, index) =>
              (typeof row.id === "string" && row.id) || index
            }
            onSave={handleSave}
            onOpenDetails={handleOpenDetails}
            exportFileName="aziende"
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
          >
            <div data-editable-table-slot="create-drawer">
              <ImportCompanyByPdf onImportSuccess={handleImportFromPdf} />
            </div>
          </EditableTable>
        )}
      </div>
    </div>
  );
}
