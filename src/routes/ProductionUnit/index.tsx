import * as React from "react";
import { useState, useMemo } from "react";
import { type ProductionUnit } from "@/api/production-unit";
import { Spinner } from "@/components/ui/spinner";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { createTextSearch } from "@/utils/filter";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import { PageHeader } from "@/components/organism/Header";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

const buildProductionUnitColumns = (): EditableColumn[] => {
  return [
    {
      id: "companyName",
      title: "Azienda",
      type: "text",
    },
    {
      id: "name",
      title: "Nome Unità Produttiva",
      type: "text",
    },
    {
      id: "cropName",
      title: "Coltura",
      type: "text",
    },
    {
      id: "cropType",
      title: "Tipo Coltura",
      type: "text",
    },
    {
      id: "variety",
      title: "Varietà",
      type: "text",
    },
    {
      id: "protocoll",
      title: "Protocollo",
      type: "text",
    },
    {
      id: "areaHa",
      title: "Area (Ha)",
      type: "number",
    },
    {
      id: "protectionStructure",
      title: "Struttura Protezione",
      type: "text",
    },
    {
      id: "fieldName",
      title: "Campo",
      type: "text",
    },
    {
      id: "startDate",
      title: "Data Inizio",
      type: "date",
    },
    {
      id: "endDate",
      title: "Data Fine",
      type: "date",
    },
  ];
};

export default function ProductionUnit(): React.ReactElement {
  const [searchFilter, setSearchFilter] = useState<string>("");

  const { productionUnits, isLoading, error } = useProductionUnit();

  // Converti i dati delle unità produttive in formato row per la tabella
  const rows = useMemo(() => {
    return productionUnits.map((pu) => ({
      id: pu.productionUnit.id,
      companyName: pu.companyName,
      name: pu.productionUnit.name,
      cropName: pu.productionUnit.cropName,
      cropType: pu.productionUnit.cropType,
      variety: pu.productionUnit.variety,
      protocoll: pu.productionUnit.protocoll,
      areaHa: pu.productionUnit.areaHa,
      protectionStructure: pu.productionUnit.protectionStructure,
      fieldName: pu.field.name,
      startDate: pu.productionUnit.startDate
        ? new Date(pu.productionUnit.startDate).toISOString().split("T")[0]
        : "",
      endDate: pu.productionUnit.endDate
        ? new Date(pu.productionUnit.endDate).toISOString().split("T")[0]
        : "",
      // Mantieni i dati completi per i dettagli
      productionUnit: pu,
    }));
  }, [productionUnits]);

  const textSearch = useMemo(
    () =>
      createTextSearch<typeof rows[0]>([
        "name",
        "companyName",
        "cropName",
        "cropType",
        "variety",
        "fieldName",
      ]),
    []
  );

  const filteredItems = useMemo(() => {
    return textSearch.setSearchTerm(searchFilter).filter(rows);
  }, [rows, searchFilter, textSearch]);

  const renderDetails = (row: Record<string, unknown>): React.ReactNode => {
    const productionUnit = row.productionUnit as ProductionUnit;
    if (!productionUnit) {
      return <div>Dettagli non disponibili</div>;
    }

    const pu = productionUnit.productionUnit;

    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Nome Unità Produttiva
            </label>
            <p className="text-sm">{pu.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Azienda</label>
            <p className="text-sm">{productionUnit.companyName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Campo</label>
            <p className="text-sm">{productionUnit.field.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Area sul Campo (Ha)
            </label>
            <p className="text-sm">{productionUnit.areaHaOnField}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Coltura</label>
            <p className="text-sm">{pu.cropName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Tipo Coltura
            </label>
            <p className="text-sm">{pu.cropType}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Varietà</label>
            <p className="text-sm">{pu.variety}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Protocollo
            </label>
            <p className="text-sm">{pu.protocoll}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Area Totale (Ha)
            </label>
            <p className="text-sm">{pu.areaHa}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Struttura Protezione
            </label>
            <p className="text-sm">{pu.protectionStructure}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Data Inizio
            </label>
            <p className="text-sm">
              {pu.startDate
                ? new Date(pu.startDate).toLocaleDateString("it-IT")
                : "-"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Data Fioritura
            </label>
            <p className="text-sm">
              {pu.floweringDate
                ? new Date(pu.floweringDate).toLocaleDateString("it-IT")
                : "-"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Data Raccolta
            </label>
            <p className="text-sm">
              {pu.harvestingDate
                ? new Date(pu.harvestingDate).toLocaleDateString("it-IT")
                : "-"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Data Fine
            </label>
            <p className="text-sm">
              {pu.endDate
                ? new Date(pu.endDate).toLocaleDateString("it-IT")
                : "-"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Occupazione
            </label>
            <p className="text-sm">{pu.occupazione || "-"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Destinazione d'Uso
            </label>
            <p className="text-sm">{pu.destinazioneDiUso || "-"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Acqua Totale Periodo (L)
            </label>
            <p className="text-sm">
              {pu.acquaTotalePeridoL
                ? pu.acquaTotalePeridoL.toLocaleString("it-IT")
                : "-"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const columns = buildProductionUnitColumns();

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Unità Produttive"
        searchPlaceholder="Cerca per nome, azienda, coltura, varietà o campo..."
        searchValue={searchFilter}
        onSearchChange={setSearchFilter}
        totalItems={productionUnits.length}
        filteredItems={filteredItems.length}
        rightElement={
          <Button asChild>
            <Link to="/new-production-unit">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi unità produttiva
            </Link>
          </Button>
        }
      />

      {/* Area scrollabile - solo la tabella */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Spinner size={20} ariaLabel="Caricamento dati" />
            <span>Caricamento dati…</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-gray-600 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium">
              Nessuna unità produttiva disponibile
            </p>
            <p className="text-xs mt-1 text-gray-500">
              Al momento non ci sono unità produttive da visualizzare
            </p>
          </div>
        ) : productionUnits.length === 0 ? (
          <div className="text-center py-8 text-gray-600 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium">
              Nessuna unità produttiva disponibile
            </p>
            <p className="text-xs mt-1 text-gray-500">
              Al momento non ci sono unità produttive da visualizzare
            </p>
          </div>
        ) : (
          <EditableTable
            columns={columns}
            rows={filteredItems}
            isModify={true}
            addButton={false}
            getRowId={(row, index) =>
              (typeof row.id === "string" && row.id) || index
            }
            detailsRenderer={renderDetails}
            detailsTitle="Dettagli Unità Produttiva"
            className="bg-background"
          />
        )}
      </div>
    </div>
  );
}

