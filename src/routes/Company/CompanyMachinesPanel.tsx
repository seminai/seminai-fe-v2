import * as React from "react";
import { useRef } from "react";
import { useMachines } from "@/hooks/useMachines";
import {
  EditableTable,
  type EditableColumn,
  type EditableTableRef,
} from "@/components/organism/EditableTable";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface CompanyMachinesPanelProps {
  companyId: string;
  companyName: string;
}

const renderDateCell = (value: unknown): React.ReactElement => {
  if (!value || typeof value !== "string") {
    return <span className="text-muted-foreground">-</span>;
  }
  try {
    const date = new Date(value);
    return <span>{format(date, "dd/MM/yyyy", { locale: it })}</span>;
  } catch {
    return <span className="text-muted-foreground">-</span>;
  }
};

const renderNumberCell = (value: unknown): React.ReactElement => {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">-</span>;
  }
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num)) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <span>
      {num} {num === 1 ? "anno" : "anni"}
    </span>
  );
};

const buildMachinesColumns = (): EditableColumn[] => {
  return [
    {
      id: "name",
      title: "Nome",
      type: "text",
      required: true,
      placeholder: "es. Trattore John Deere 6120M",
    },
    {
      id: "identifier",
      title: "Identificativo",
      type: "text",
      required: true,
      placeholder: "es. TR-001",
    },
    {
      id: "lastPositiveRevisionDate",
      title: "Ultima Revisione",
      type: "date",
      placeholder: "Data ultima revisione",
      render: renderDateCell,
    },
    {
      id: "revisionReminderDays",
      title: "Preavviso Revisione (anni)",
      type: "number",
      placeholder: "es. 2",
      render: renderNumberCell,
    },
    {
      id: "functionalControlDate",
      title: "Controllo Funzionale",
      type: "date",
      placeholder: "Data ultimo controllo",
      render: renderDateCell,
    },
    {
      id: "functionalControlReminderDays",
      title: "Preavviso Controllo (anni)",
      type: "number",
      placeholder: "es. 2",
      render: renderNumberCell,
    },
    {
      id: "calibrationDate",
      title: "Ultima Taratura",
      type: "date",
      placeholder: "Data ultima taratura",
      render: renderDateCell,
    },
    {
      id: "calibrationReminderDays",
      title: "Preavviso Taratura (anni)",
      type: "number",
      placeholder: "es. 2",
      render: renderNumberCell,
    },
  ];
};

export function CompanyMachinesPanel({
  companyId,
}: CompanyMachinesPanelProps): React.ReactElement {
  const tableRef = useRef<EditableTableRef>(null);

  const {
    machines,
    isLoading,
    isError,
    error,
    refetch,
    bulkCreate,
    updateMachine,
    bulkDelete,
  } = useMachines(companyId);

  const columns = React.useMemo(() => buildMachinesColumns(), []);

  const formatDateForInput = (dateValue: string | null): string => {
    if (!dateValue) {
      return "";
    }
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return "";
      }
      // Converti in formato yyyy-MM-dd per l'input HTML5 date
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  // Converte giorni in anni per la visualizzazione (definito prima di rows useMemo)
  const convertDaysToYears = (days: number | null): number | null => {
    if (days === null || days === undefined) {
      return null;
    }
    return Math.round(days / 365);
  };

  const rows = React.useMemo(() => {
    return machines.map((machine) => ({
      id: machine.id,
      name: machine.name,
      identifier: machine.identifier,
      lastPositiveRevisionDate: formatDateForInput(
        machine.lastPositiveRevisionDate,
      ),
      // Converti giorni dal backend in anni per la visualizzazione
      revisionReminderDays: convertDaysToYears(machine.revisionReminderDays),
      functionalControlDate: formatDateForInput(machine.functionalControlDate),
      functionalControlReminderDays: convertDaysToYears(
        machine.functionalControlReminderDays,
      ),
      calibrationDate: formatDateForInput(machine.calibrationDate),
      calibrationReminderDays: convertDaysToYears(
        machine.calibrationReminderDays,
      ),
      companyId: machine.companyId,
      createdAt: machine.createdAt,
      updatedAt: machine.updatedAt,
    }));
  }, [machines]);

  const formatDateForApi = (dateValue: unknown): string | null => {
    if (!dateValue || typeof dateValue !== "string") {
      return null;
    }
    const trimmed = dateValue.trim();
    if (!trimmed) {
      return null;
    }
    // Se è già in formato ISO, restituiscilo
    if (trimmed.includes("T") || trimmed.includes("Z")) {
      return trimmed;
    }
    // Se è in formato yyyy-MM-dd (formato HTML5 date input), convertilo in ISO
    try {
      const date = new Date(trimmed);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString();
    } catch {
      return null;
    }
  };

  const formatNumberForApi = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const num = typeof value === "number" ? value : Number(value);
    if (isNaN(num)) {
      return null;
    }
    return num;
  };

  // Converte anni in giorni per l'invio al backend
  const convertYearsToDays = (years: unknown): number | null => {
    const num = formatNumberForApi(years);
    if (num === null) {
      return null;
    }
    return Math.round(num * 365);
  };

  const handleSave = async (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }): Promise<void> => {
    // Gestione creazione
    if (payload.created.length > 0) {
      const machinesToCreate = payload.created.map((row) => ({
        name: String(row.name || ""),
        identifier: String(row.identifier || ""),
        lastPositiveRevisionDate: formatDateForApi(
          row.lastPositiveRevisionDate,
        ),
        // Converti anni in giorni per l'invio al backend
        revisionReminderDays: convertYearsToDays(row.revisionReminderDays),
        functionalControlDate: formatDateForApi(row.functionalControlDate),
        functionalControlReminderDays: convertYearsToDays(
          row.functionalControlReminderDays,
        ),
        calibrationDate: formatDateForApi(row.calibrationDate),
        calibrationReminderDays: convertYearsToDays(
          row.calibrationReminderDays,
        ),
      }));

      await bulkCreate(machinesToCreate);
    }

    // Gestione aggiornamento
    if (payload.updated.length > 0) {
      const updatePromises = payload.updated.map(async (row) => {
        const machineId = String(row.id || "");
        if (!machineId) {
          return;
        }

        const updateData: {
          name?: string;
          identifier?: string;
          lastPositiveRevisionDate?: string | null;
          revisionReminderDays?: number | null;
          functionalControlDate?: string | null;
          functionalControlReminderDays?: number | null;
          calibrationDate?: string | null;
          calibrationReminderDays?: number | null;
        } = {};

        if (row.name !== undefined) {
          updateData.name = String(row.name);
        }
        if (row.identifier !== undefined) {
          updateData.identifier = String(row.identifier);
        }
        if (row.lastPositiveRevisionDate !== undefined) {
          updateData.lastPositiveRevisionDate = formatDateForApi(
            row.lastPositiveRevisionDate,
          );
        }
        if (row.revisionReminderDays !== undefined) {
          // Converti anni in giorni per l'invio al backend
          updateData.revisionReminderDays = convertYearsToDays(
            row.revisionReminderDays,
          );
        }
        if (row.functionalControlDate !== undefined) {
          updateData.functionalControlDate = formatDateForApi(
            row.functionalControlDate,
          );
        }
        if (row.functionalControlReminderDays !== undefined) {
          // Converti anni in giorni per l'invio al backend
          updateData.functionalControlReminderDays = convertYearsToDays(
            row.functionalControlReminderDays,
          );
        }
        if (row.calibrationDate !== undefined) {
          updateData.calibrationDate = formatDateForApi(row.calibrationDate);
        }
        if (row.calibrationReminderDays !== undefined) {
          // Converti anni in giorni per l'invio al backend
          updateData.calibrationReminderDays = convertYearsToDays(
            row.calibrationReminderDays,
          );
        }

        if (Object.keys(updateData).length > 0) {
          await updateMachine({ machineId, data: updateData });
        }
      });

      await Promise.all(updatePromises);
    }
  };

  const handleDelete = async (
    removed: Array<Record<string, unknown>>,
  ): Promise<void> => {
    const machineIds = removed
      .map((row) => {
        const id = row.id;
        return typeof id === "string" ? id : String(id);
      })
      .filter((id) => id.length > 0);

    if (machineIds.length > 0) {
      await bulkDelete(machineIds);
    }
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 p-4 text-red-700">
          <p className="text-sm font-semibold">
            Impossibile caricare le macchine dell&apos;azienda.
          </p>
          {error?.message && (
            <p className="text-xs text-red-600/80">{error.message}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetch();
            }}
            className="border-red-200 text-red-700 hover:bg-red-100/60"
          >
            Riprova
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-black">
        <Spinner size={28} ariaLabel="Caricamento macchine" />
        <p className="text-sm">Caricamento macchine in corso…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <EditableTable
          ref={tableRef}
          columns={columns}
          rows={rows}
          isModify={true}
          addButton={true}
          getRowId={(row, index) =>
            (typeof row.id === "string" && row.id) || index
          }
          onSave={handleSave}
          onDeleteSelected={handleDelete}
          exportFileName="macchine"
          newRowDefaults={{
            name: "",
            identifier: "",
            lastPositiveRevisionDate: "",
            revisionReminderDays: "",
            functionalControlDate: "",
            functionalControlReminderDays: "",
            calibrationDate: "",
            calibrationReminderDays: "",
          }}
          className="bg-white"
        />
      </div>
    </div>
  );
}
