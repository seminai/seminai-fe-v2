import * as React from "react";
import { useRef } from "react";
import { useMachines } from "@/hooks/useMachines";
import {
  EditableTable,
  type EditableColumn,
  type EditableTable as EditableTableType,
} from "@/components/organism/EditableTable";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Wrench } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface CompanyMachinesPanelProps {
  companyId: string;
  companyName: string;
}

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
      render: (value: unknown) => {
        if (!value || typeof value !== "string") {
          return <span className="text-muted-foreground">-</span>;
        }
        try {
          const date = new Date(value);
          return <span>{format(date, "dd/MM/yyyy", { locale: it })}</span>;
        } catch {
          return <span className="text-muted-foreground">-</span>;
        }
      },
    },
  ];
};

export function CompanyMachinesPanel({
  companyId,
  companyName,
}: CompanyMachinesPanelProps): React.ReactElement {
  const tableRef = useRef<EditableTableType>(null);

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

  const rows = React.useMemo(() => {
    return machines.map((machine) => ({
      id: machine.id,
      name: machine.name,
      identifier: machine.identifier,
      lastPositiveRevisionDate: formatDateForInput(
        machine.lastPositiveRevisionDate
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
          row.lastPositiveRevisionDate
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
        } = {};

        if (row.name !== undefined) {
          updateData.name = String(row.name);
        }
        if (row.identifier !== undefined) {
          updateData.identifier = String(row.identifier);
        }
        if (row.lastPositiveRevisionDate !== undefined) {
          updateData.lastPositiveRevisionDate = formatDateForApi(
            row.lastPositiveRevisionDate
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
    removed: Array<Record<string, unknown>>
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
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-agri-green-700">
        <Spinner size={28} ariaLabel="Caricamento macchine" />
        <p className="text-sm">Caricamento macchine in corso…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-agri-green-50/40 to-field-50/30 rounded-2xl p-5 border border-agri-green-100/60 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-agri-green-700" />
            <div>
              <h3 className="text-sm font-semibold text-agri-green-700">
                Parco Macchine
              </h3>
              <p className="text-xs text-muted-foreground">
                Gestisci le macchine dell&apos;azienda {companyName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetch();
              }}
              disabled={isLoading}
              className="rounded-full border-agri-green-200 text-agri-green-700 hover:bg-agri-green-50/80"
            >
              {isLoading ? (
                <Spinner size={18} ariaLabel="Aggiornamento macchine" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              Aggiorna
            </Button>
          </div>
        </div>

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
          }}
          className="bg-background"
        />
      </div>
    </div>
  );
}
