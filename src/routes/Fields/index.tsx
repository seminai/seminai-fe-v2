import * as React from "react";
import { useState, useMemo, useRef } from "react";
import {
  type Field,
  type BulkFieldInput,
  type BulkFieldUpdateInput,
} from "@/api/fields";
import { Spinner } from "@/components/ui/spinner";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { createTextSearch } from "@/utils/filter";
import { DrawerFieldContent } from "./DrawerField";
import { ImportFieldByCsv } from "./importFieldByCsv";
import { useFields } from "@/hooks/useFields";
import { useCompanies } from "@/hooks/useCompanies";
import { toast } from "sonner";
import { type Company } from "@/api/companies";
import { PageHeader } from "@/components/organism/Header";

const buildFieldsEditColumns = (companies: Company[]): EditableColumn[] => {
  return [
    {
      id: "companyName",
      title: "Azienda",
      type: "select",
      required: true,
      options: companies.map((company) => ({
        label: company.name,
        value: company.id,
      })),
      placeholder: "Seleziona azienda",
    },
    {
      id: "name",
      title: "Nome Campo",
      type: "text",
      required: true,
      placeholder: "es. Campo Nord",
    },
    {
      id: "address",
      title: "Indirizzo",
      type: "text",
      required: true,
      placeholder: "es. Via Roma 1",
    },
    {
      id: "sezione",
      title: "Sezione",
      type: "text",
      required: true,
      placeholder: "es. A",
    },
    {
      id: "foglio",
      title: "Foglio",
      type: "text",
      required: true,
      placeholder: "es. 12",
    },
    {
      id: "particella",
      title: "Particella",
      type: "text",
      required: true,
      placeholder: "es. 345",
    },
    {
      id: "superficieCatastaleMq",
      title: "Sup. Catastale (mq)",
      type: "number",
      required: true,
      placeholder: "es. 12000",
    },
    {
      id: "city",
      title: "Città",
      type: "text",
      placeholder: "es. Torino",
    },
    {
      id: "sauHa",
      title: "SAU (Ha)",
      type: "number",
      required: true,
      placeholder: "es. 1.2",
    },
    {
      id: "uso",
      title: "Uso",
      type: "text",
      placeholder: "es. Seminativo",
    },
    {
      id: "soilType",
      title: "Tipo Suolo",
      type: "select",
      options: [
        { label: "Argilloso", value: "ARGILLOSO" },
        { label: "Sabbioso", value: "SABBIOSO" },
        { label: "Limoso", value: "LIMOSO" },
        { label: "Franco", value: "FRANCO" },
        { label: "Limo-Sabbia", value: "LIMO-SABBIA" },
        { label: "Franco-Sabbioso", value: "FRANCO-SABBIOSO" },
        { label: "Franco-Argilloso", value: "FRANCO-ARGILLOSO" },
        { label: "Franco-Limoso", value: "FRANCO-LIMOSO" },
      ],
    },
  ];
};

export default function Fields(): React.ReactElement {
  const [searchFilter, setSearchFilter] = useState<string>("");
  const tableRef = useRef<EditableTable>(null);

  const {
    fields,
    isLoading,
    error,
    createFields,
    updateFields,
    isUpdating,
  } = useFields();
  const { companies, isLoading: isLoadingCompanies } = useCompanies();

  const textSearch = useMemo(
    () =>
      createTextSearch<Field>([
        "name",
        "address",
        "city",
        "foglio",
        "particella",
      ]),
    []
  );

  const filteredItems = useMemo(() => {
    return textSearch.setSearchTerm(searchFilter).filter(fields);
  }, [fields, searchFilter, textSearch]);

  const renderDetails = (row: Record<string, unknown>): React.ReactNode => {
    const fieldId = typeof row.id === "string" ? row.id : String(row.id);

    // Trova sempre il campo più recente dalla lista aggiornata
    const field =
      fields.find((f) => f.id === fieldId) || (row as unknown as Field);

    const handleUpdate = (update: BulkFieldUpdateInput): void => {
      updateFields([update]);
    };

    // Usa updatedAt come key per forzare il re-render quando i dati cambiano
    const key = `${field.id}-${field.updatedAt || Date.now()}`;

    return (
      <DrawerFieldContent
        key={key}
        field={field}
        onUpdate={handleUpdate}
        isUpdating={isUpdating}
      />
    );
  };

  /**
   * Gestisce l'importazione dei campi da CSV
   * Aggiunge i campi come nuove righe nella tabella editabile
   */
  const handleImportFromCsv = (fieldsToImport: BulkFieldInput[]): void => {
    if (!tableRef.current) {
      toast.error("Tabella non disponibile");
      return;
    }

    // Converti i campi in formato row per la tabella
    const rowsToAdd = fieldsToImport.map((field) => ({
      companyName: field.companyId || "",
      name: field.name || "",
      address: field.address || "",
      sezione: field.sezione || "",
      foglio: field.foglio || "",
      particella: field.particella || "",
      superficieCatastaleMq: field.superficieCatastaleMq || "",
      city: field.city || "",
      sauHa: field.sauHa || "",
      uso: field.uso || "",
      soilType: field.soilType || "",
    }));

    // Aggiungi le righe alla tabella
    tableRef.current.addRows(rowsToAdd);

    toast.success(
      `${fieldsToImport.length} camp${
        fieldsToImport.length === 1 ? "o aggiunto" : "i aggiunti"
      } alla tabella. Completa i dati e salva.`
    );
  };

  const handleSave = (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => {
    // Validazione: verifica che tutti i campi da creare abbiano un'azienda
    const fieldsWithoutCompany = payload.created.filter(
      (field) => !field.companyName
    );
    if (fieldsWithoutCompany.length > 0) {
      toast.error(
        `Devi selezionare un'azienda per ${
          fieldsWithoutCompany.length === 1 ? "il campo" : "i campi"
        } da creare`
      );
      return;
    }

    const fieldsToCreate = payload.created.map((field) => {
      const bulkField: BulkFieldInput = {
        companyId: String(field.companyName || ""),
        name: String(field.name || ""),
        address: String(field.address || ""),
        sezione: String(field.sezione || ""),
        foglio: String(field.foglio || ""),
        particella: String(field.particella || ""),
        superficieCatastaleMq: Number(field.superficieCatastaleMq || 0),
        city: String(field.city || ""),
        sauHa: field.sauHa ? Number(field.sauHa) : 0,
        uso: String(field.uso || ""),
        soilType: String(field.soilType || ""),
      };

      return bulkField;
    });

    const fieldsToUpdate = payload.updated.map((field) => {
      const updateField: BulkFieldUpdateInput = {
        id: String(field.id),
      };

      if (field.name !== undefined) updateField.name = String(field.name);
      if (field.address !== undefined)
        updateField.address = String(field.address);
      if (field.sezione !== undefined)
        updateField.sezione = String(field.sezione);
      if (field.foglio !== undefined) updateField.foglio = String(field.foglio);
      if (field.particella !== undefined)
        updateField.particella = String(field.particella);
      if (field.superficieCatastaleMq !== undefined)
        updateField.superficieCatastaleMq = Number(field.superficieCatastaleMq);
      if (field.city !== undefined) updateField.city = String(field.city);
      if (field.sauHa !== undefined)
        updateField.sauHa = field.sauHa ? Number(field.sauHa) : 0;
      if (field.uso !== undefined) updateField.uso = String(field.uso);
      if (field.soilType !== undefined)
        updateField.soilType = String(field.soilType);

      return updateField;
    });

    if (fieldsToCreate.length === 0 && fieldsToUpdate.length === 0) {
      toast.error("Nessuna modifica da salvare");
      return;
    }

    if (fieldsToCreate.length > 0) {
      createFields(fieldsToCreate);
    }

    if (fieldsToUpdate.length > 0) {
      updateFields(fieldsToUpdate as BulkFieldUpdateInput[]);
    }
  };

  // Colonne unificate per view e edit
  const columns = buildFieldsEditColumns(companies);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Campi"
        searchPlaceholder="Cerca per nome, indirizzo, città, foglio o particella..."
        searchValue={searchFilter}
        onSearchChange={setSearchFilter}
        totalItems={fields.length}
        filteredItems={filteredItems.length}
      />

      {/* Area scrollabile - solo la tabella */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {isLoading || isLoadingCompanies ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Spinner size={20} ariaLabel="Caricamento dati" />
            <span>Caricamento dati…</span>
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">
            Impossibile caricare i campi. Errore:{" "}
            {error instanceof Error ? error.message : "Errore sconosciuto"}
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-8 text-yellow-600 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm font-medium">Nessuna azienda disponibile</p>
            <p className="text-xs mt-1">
              Devi prima creare un'azienda prima di poter aggiungere campi
            </p>
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
              companyName: "",
              name: "",
              address: "",
              sezione: "",
              foglio: "",
              particella: "",
              superficieCatastaleMq: "",
              city: "",
              sauHa: "",
              uso: "",
              soilType: "",
            }}
            detailsRenderer={renderDetails}
            detailsTitle="Dettagli Campo"
            className="bg-background"
          >
            <ImportFieldByCsv
              companies={companies}
              onImportSuccess={handleImportFromCsv}
            />
          </EditableTable>
        )}
      </div>
    </div>
  );
}
