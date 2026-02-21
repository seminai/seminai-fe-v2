import * as React from "react";
import { useRef } from "react";
import { useCompanyWarehouses } from "@/hooks/useCompanyWarehouses";
import {
  EditableTable,
  type EditableColumn,
  type EditableTableRef,
} from "@/components/organism/EditableTable";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

interface CompanyWarehousesPanelProps {
  companyId: string;
  companyName: string;
}

const buildWarehousesColumns = (): EditableColumn[] => {
  return [
    {
      id: "name",
      title: "Nome Magazzino",
      type: "text",
      required: true,
      placeholder: "es. Magazzino Principale",
    },
    {
      id: "nation",
      title: "Nazione",
      type: "text",
      required: true,
      placeholder: "es. Italia",
    },
    {
      id: "region",
      title: "Regione",
      type: "text",
      required: true,
      placeholder: "es. Lombardia",
    },
    {
      id: "city",
      title: "Città",
      type: "text",
      required: true,
      placeholder: "es. Milano",
    },
    {
      id: "address",
      title: "Indirizzo",
      type: "text",
      required: true,
      placeholder: "es. Via Roma 1",
    },
    {
      id: "cap",
      title: "CAP",
      type: "text",
      required: true,
      placeholder: "es. 20100",
    },
    {
      id: "sezione",
      title: "Sezione",
      type: "text",
      placeholder: "es. A",
    },
    {
      id: "foglio",
      title: "Foglio",
      type: "text",
      placeholder: "es. 123",
    },
    {
      id: "particella",
      title: "Particella",
      type: "text",
      placeholder: "es. 45",
    },
    {
      id: "subalterno",
      title: "Subalterno",
      type: "text",
      placeholder: "es. 1",
    },
  ];
};

export function CompanyWarehousesPanel({
  companyId,
}: CompanyWarehousesPanelProps): React.ReactElement {
  const tableRef = useRef<EditableTableRef>(null);

  const {
    warehouses,
    isLoading,
    isError,
    error,
    refetch,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
  } = useCompanyWarehouses(companyId);

  const columns = React.useMemo(() => buildWarehousesColumns(), []);

  const rows = React.useMemo(() => {
    return warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name || "",
      nation: warehouse.nation || "",
      region: warehouse.region || "",
      city: warehouse.city || "",
      address: warehouse.address || "",
      cap: warehouse.cap || "",
      sezione: warehouse.sezione || "",
      foglio: warehouse.foglio || "",
      particella: warehouse.particella || "",
      subalterno: warehouse.subalterno || "",
      companyId: warehouse.companyId,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
    }));
  }, [warehouses]);

  const handleSave = async (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }): Promise<void> => {
    // Gestione creazione: obbligatori = nome, indirizzo, città, nazione, regione, CAP; opzionali = stringa vuota se non inseriti
    if (payload.created.length > 0) {
      const createPromises = payload.created.map(async (row) => {
        await createWarehouse({
          name: String(row.name ?? "").trim(),
          nation: String(row.nation ?? "").trim(),
          region: String(row.region ?? "").trim(),
          city: String(row.city ?? "").trim(),
          address: String(row.address ?? "").trim(),
          cap: String(row.cap ?? "").trim(),
          sezione: row.sezione != null && String(row.sezione).trim() !== "" ? String(row.sezione).trim() : "",
          foglio: row.foglio != null && String(row.foglio).trim() !== "" ? String(row.foglio).trim() : "",
          particella: row.particella != null && String(row.particella).trim() !== "" ? String(row.particella).trim() : "",
          subalterno: row.subalterno != null && String(row.subalterno).trim() !== "" ? String(row.subalterno).trim() : "",
        });
      });

      await Promise.all(createPromises);
    }

    // Gestione aggiornamento
    if (payload.updated.length > 0) {
      const updatePromises = payload.updated.map(async (row) => {
        const warehouseId = String(row.id || "");
        if (!warehouseId) {
          return;
        }

        const updateData: {
          name?: string;
          nation?: string;
          region?: string;
          city?: string;
          address?: string;
          cap?: string;
          sezione?: string | null;
          foglio?: string | null;
          particella?: string | null;
          subalterno?: string | null;
        } = {};

        if (row.name !== undefined) {
          updateData.name = String(row.name);
        }
        if (row.nation !== undefined) {
          updateData.nation = String(row.nation);
        }
        if (row.region !== undefined) {
          updateData.region = String(row.region);
        }
        if (row.city !== undefined) {
          updateData.city = String(row.city);
        }
        if (row.address !== undefined) {
          updateData.address = String(row.address);
        }
        if (row.cap !== undefined) {
          updateData.cap = String(row.cap);
        }
        if (row.sezione !== undefined) {
          updateData.sezione = row.sezione != null && String(row.sezione).trim() !== "" ? String(row.sezione).trim() : "";
        }
        if (row.foglio !== undefined) {
          updateData.foglio = row.foglio != null && String(row.foglio).trim() !== "" ? String(row.foglio).trim() : "";
        }
        if (row.particella !== undefined) {
          updateData.particella =
            row.particella != null && String(row.particella).trim() !== ""
              ? String(row.particella).trim()
              : "";
        }
        if (row.subalterno !== undefined) {
          updateData.subalterno =
            row.subalterno != null && String(row.subalterno).trim() !== ""
              ? String(row.subalterno).trim()
              : "";
        }

        if (Object.keys(updateData).length > 0) {
          await updateWarehouse({ warehouseId, data: updateData });
        }
      });

      await Promise.all(updatePromises);
    }
  };

  const handleDelete = async (
    removed: Array<Record<string, unknown>>
  ): Promise<void> => {
    const deletePromises = removed.map(async (row) => {
      const id = row.id;
      const warehouseId = typeof id === "string" ? id : String(id);
      if (warehouseId.length > 0) {
        await deleteWarehouse(warehouseId);
      }
    });

    await Promise.all(deletePromises);
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 p-4 text-red-700">
          <p className="text-sm font-semibold">
            Impossibile caricare i magazzini dell&apos;azienda.
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
        <Spinner size={28} ariaLabel="Caricamento magazzini" />
        <p className="text-sm">Caricamento magazzini in corso…</p>
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
          exportFileName="magazzini"
          newRowDefaults={{
            name: "",
            nation: "",
            region: "",
            city: "",
            address: "",
            cap: "",
            sezione: "",
            foglio: "",
            particella: "",
            subalterno: "",
          }}
          className="bg-white"
        />
      </div>
    </div>
  );
}
