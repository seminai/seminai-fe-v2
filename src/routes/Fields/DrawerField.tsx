import * as React from "react";
import { type Field } from "@/api/fields";

interface DrawerFieldContentProps {
  field: Field;
}

/**
 * DrawerFieldContent - Componente funzionale per visualizzare i dettagli completi di un campo
 * Organizza le informazioni in sezioni logiche
 */
export function DrawerFieldContent({
  field,
}: DrawerFieldContentProps): React.ReactElement {
  const renderGeneralInfo = (): React.ReactNode => {
    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Informazioni Generali
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Azienda</p>
            <p className="text-sm font-medium">{field.companyName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nome Campo</p>
            <p className="text-sm font-medium">{field.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Indirizzo</p>
            <p className="text-sm font-medium">{field.address}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Città</p>
            <p className="text-sm font-medium">{field.city || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CAP</p>
            <p className="text-sm font-medium">{field.cap || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Regione</p>
            <p className="text-sm font-medium">{field.region || "-"}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderCadastralData = (): React.ReactNode => {
    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Dati Catastali
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Foglio</p>
            <p className="text-sm font-medium">{field.foglio}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Particella</p>
            <p className="text-sm font-medium">{field.particella}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subalterno</p>
            <p className="text-sm font-medium">{field.subalterno || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sezione</p>
            <p className="text-sm font-medium">{field.sezione || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Superficie Catastale (mq)
            </p>
            <p className="text-sm font-medium">{field.superficieCatastaleMq}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderAgronomicData = (): React.ReactNode => {
    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Dati Agronomici
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">SAU (Ha)</p>
            <p className="text-sm font-medium">
              {field.sauHa ? field.sauHa.toFixed(2) : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">GIS (Ha)</p>
            <p className="text-sm font-medium">
              {field.gisHa ? field.gisHa.toFixed(2) : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tipo di Suolo</p>
            <p className="text-sm font-medium">{field.soilType || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Uso</p>
            <p className="text-sm font-medium">{field.uso || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Qualità</p>
            <p className="text-sm font-medium">{field.qualita || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">pH</p>
            <p className="text-sm font-medium">{field.ph || "-"}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderNutrients = (): React.ReactNode => {
    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Elementi Nutritivi
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Azoto (N)</p>
            <p className="text-sm font-medium">{field.nitrogen || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fosforo (P)</p>
            <p className="text-sm font-medium">{field.phosphorus || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Potassio (K)</p>
            <p className="text-sm font-medium">{field.potassium || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Calcio (Ca)</p>
            <p className="text-sm font-medium">{field.calcium || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Magnesio (Mg)</p>
            <p className="text-sm font-medium">{field.magnesium || "-"}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderProductionUnits = (): React.ReactNode | null => {
    if (!field.productionUnits || field.productionUnits.length === 0) {
      return null;
    }

    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Unità Produttive ({field.productionUnits.length})
        </h3>
        <div className="space-y-3">
          {field.productionUnits.map((unit) => (
            <div
              key={unit.id}
              className="p-3 bg-muted/30 rounded-lg border border-border/20"
            >
              <p className="text-sm font-medium mb-2">{unit.name}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Coltura: </span>
                  <span>{unit.cropName || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Varietà: </span>
                  <span>{unit.cropVariety || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Categoria: </span>
                  <span>{unit.cropCategory || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">SAU (Ha): </span>
                  <span>{unit.sauHa ? unit.sauHa.toFixed(2) : "-"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderConductionPeriod = (): React.ReactNode => {
    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Periodo di Conduzione
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Inizio Conduzione</p>
            <p className="text-sm font-medium">
              {field.inizioConduzione
                ? new Date(field.inizioConduzione).toLocaleDateString("it-IT")
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fine Conduzione</p>
            <p className="text-sm font-medium">
              {field.fineConduzione
                ? new Date(field.fineConduzione).toLocaleDateString("it-IT")
                : "-"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderGeneralInfo()}
      {renderCadastralData()}
      {renderAgronomicData()}
      {renderNutrients()}
      {renderProductionUnits()}
      {renderConductionPeriod()}
    </div>
  );
}
