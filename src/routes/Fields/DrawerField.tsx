import * as React from "react";
import { useState, useEffect } from "react";
import { type Field, type BulkFieldUpdateInput } from "@/api/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Check, X } from "lucide-react";

interface DrawerFieldContentProps {
  field: Field;
  onUpdate?: (update: BulkFieldUpdateInput) => void;
  isUpdating?: boolean;
}

const SOIL_TYPE_OPTIONS = [
  { label: "Argilloso", value: "ARGILLOSO" },
  { label: "Sabbioso", value: "SABBIOSO" },
  { label: "Limoso", value: "LIMOSO" },
  { label: "Franco", value: "FRANCO" },
  { label: "Limo-Sabbia", value: "LIMO-SABBIA" },
  { label: "Franco-Sabbioso", value: "FRANCO-SABBIOSO" },
  { label: "Franco-Argilloso", value: "FRANCO-ARGILLOSO" },
  { label: "Franco-Limoso", value: "FRANCO-LIMOSO" },
];

/**
 * DrawerFieldContent - Componente funzionale per visualizzare i dettagli completi di un campo
 * Organizza le informazioni in sezioni logiche con possibilità di modifica
 */
export function DrawerFieldContent({
  field,
  onUpdate,
  isUpdating = false,
}: DrawerFieldContentProps): React.ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Field>>({
    name: field.name,
    address: field.address,
    city: field.city || "",
    cap: field.cap || "",
    region: field.region || "",
    foglio: field.foglio,
    particella: field.particella,
    subalterno: field.subalterno || "",
    sezione: field.sezione,
    superficieCatastaleMq: field.superficieCatastaleMq,
    sauHa: field.sauHa || 0,
    gisHa: field.gisHa || 0,
    soilType: field.soilType || "",
    uso: field.uso || "",
    qualita: field.qualita || "",
    ph: field.ph || null,
    nitrogen: field.nitrogen || null,
    phosphorus: field.phosphorus || null,
    potassium: field.potassium || null,
    calcium: field.calcium || null,
    magnesium: field.magnesium || null,
    inizioConduzione: field.inizioConduzione || "",
    fineConduzione: field.fineConduzione || "",
  });

  // Aggiorna i dati quando il field cambia (dopo un update)
  useEffect(() => {
    if (!isEditing) {
      setEditedData({
        name: field.name,
        address: field.address,
        city: field.city || "",
        cap: field.cap || "",
        region: field.region || "",
        foglio: field.foglio,
        particella: field.particella,
        subalterno: field.subalterno || "",
        sezione: field.sezione,
        superficieCatastaleMq: field.superficieCatastaleMq,
        sauHa: field.sauHa || 0,
        gisHa: field.gisHa || 0,
        soilType: field.soilType || "",
        uso: field.uso || "",
        qualita: field.qualita || "",
        ph: field.ph || null,
        nitrogen: field.nitrogen || null,
        phosphorus: field.phosphorus || null,
        potassium: field.potassium || null,
        calcium: field.calcium || null,
        magnesium: field.magnesium || null,
        inizioConduzione: field.inizioConduzione || "",
        fineConduzione: field.fineConduzione || "",
      });
    }
  }, [field, isEditing]);

  const handleSave = (): void => {
    if (!onUpdate) return;

    const updateData: BulkFieldUpdateInput = {
      id: field.id,
    };

    // Aggiungi solo i campi modificati
    if (editedData.name !== field.name) updateData.name = editedData.name;
    if (editedData.address !== field.address)
      updateData.address = editedData.address;
    if (editedData.city !== (field.city || ""))
      updateData.city = editedData.city || null;
    if (editedData.cap !== (field.cap || ""))
      updateData.cap = editedData.cap || null;
    if (editedData.region !== (field.region || ""))
      updateData.region = editedData.region || null;
    if (editedData.foglio !== field.foglio)
      updateData.foglio = editedData.foglio;
    if (editedData.particella !== field.particella)
      updateData.particella = editedData.particella;
    if (editedData.subalterno !== (field.subalterno || ""))
      updateData.subalterno = editedData.subalterno || null;
    if (editedData.sezione !== field.sezione)
      updateData.sezione = editedData.sezione;
    if (editedData.superficieCatastaleMq !== field.superficieCatastaleMq)
      updateData.superficieCatastaleMq = editedData.superficieCatastaleMq;
    if (editedData.sauHa !== (field.sauHa || 0))
      updateData.sauHa = editedData.sauHa || null;
    if (editedData.gisHa !== (field.gisHa || 0))
      updateData.gisHa = editedData.gisHa || null;
    if (editedData.soilType !== (field.soilType || ""))
      updateData.soilType = editedData.soilType || null;
    if (editedData.uso !== (field.uso || ""))
      updateData.uso = editedData.uso || null;
    if (editedData.qualita !== (field.qualita || ""))
      updateData.qualita = editedData.qualita || null;
    if (editedData.ph !== (field.ph || null)) updateData.ph = editedData.ph;
    if (editedData.nitrogen !== (field.nitrogen || null))
      updateData.nitrogen = editedData.nitrogen;
    if (editedData.phosphorus !== (field.phosphorus || null))
      updateData.phosphorus = editedData.phosphorus;
    if (editedData.potassium !== (field.potassium || null))
      updateData.potassium = editedData.potassium;
    if (editedData.calcium !== (field.calcium || null))
      updateData.calcium = editedData.calcium;
    if (editedData.magnesium !== (field.magnesium || null))
      updateData.magnesium = editedData.magnesium;
    if (editedData.inizioConduzione !== (field.inizioConduzione || ""))
      updateData.inizioConduzione = editedData.inizioConduzione || null;
    if (editedData.fineConduzione !== (field.fineConduzione || ""))
      updateData.fineConduzione = editedData.fineConduzione || null;

    onUpdate(updateData);
    setIsEditing(false);
  };

  const handleCancel = (): void => {
    setEditedData({
      name: field.name,
      address: field.address,
      city: field.city || "",
      cap: field.cap || "",
      region: field.region || "",
      foglio: field.foglio,
      particella: field.particella,
      subalterno: field.subalterno || "",
      sezione: field.sezione,
      superficieCatastaleMq: field.superficieCatastaleMq,
      sauHa: field.sauHa || 0,
      gisHa: field.gisHa || 0,
      soilType: field.soilType || "",
      uso: field.uso || "",
      qualita: field.qualita || "",
      ph: field.ph || null,
      nitrogen: field.nitrogen || null,
      phosphorus: field.phosphorus || null,
      potassium: field.potassium || null,
      calcium: field.calcium || null,
      magnesium: field.magnesium || null,
      inizioConduzione: field.inizioConduzione || "",
      fineConduzione: field.fineConduzione || "",
    });
    setIsEditing(false);
  };

  const renderGeneralInfo = (): React.ReactNode => {
    return (
      <div className="bg-gradient-to-br from-agri-green-50/50 to-harvest-100/30 rounded-2xl p-5 border border-agri-green-100/50 shadow-sm">
        <h3 className="text-sm font-semibold text-agri-green-700 mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-agri-green-500"></div>
          Informazioni Generali
        </h3>
        <div className="grid grid-cols-2 gap-5">
          <div className="col-span-2">
            <p className="text-xs font-medium text-agri-green-600 mb-1.5">
              Azienda
            </p>
            <p className="text-sm font-semibold text-foreground">
              {field.companyName}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-agri-green-600 mb-1.5">
              Nome Campo
            </p>
            {isEditing ? (
              <Input
                value={editedData.name || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, name: e.target.value })
                }
                className="bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
                placeholder="Nome Campo"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.name}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-agri-green-600 mb-1.5">
              Indirizzo
            </p>
            {isEditing ? (
              <Input
                value={editedData.address || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, address: e.target.value })
                }
                className="bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
                placeholder="Indirizzo"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.address}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-agri-green-600 mb-1.5">
              Città
            </p>
            {isEditing ? (
              <Input
                value={editedData.city || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, city: e.target.value })
                }
                className="bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
                placeholder="Città"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.city || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-agri-green-600 mb-1.5">
              CAP
            </p>
            {isEditing ? (
              <Input
                value={editedData.cap || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, cap: e.target.value })
                }
                className="bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
                placeholder="CAP"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.cap || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-agri-green-600 mb-1.5">
              Regione
            </p>
            {isEditing ? (
              <Input
                value={editedData.region || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, region: e.target.value })
                }
                className="bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
                placeholder="Regione"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.region || "-"}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCadastralData = (): React.ReactNode => {
    return (
      <div className="bg-gradient-to-br from-field-50/50 to-nature-100/30 rounded-2xl p-5 border border-field-200/50 shadow-sm">
        <h3 className="text-sm font-semibold text-field-600 mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-field-500"></div>
          Dati Catastali
        </h3>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">Foglio</p>
            {isEditing ? (
              <Input
                value={editedData.foglio || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, foglio: e.target.value })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Foglio"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.foglio}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">
              Particella
            </p>
            {isEditing ? (
              <Input
                value={editedData.particella || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, particella: e.target.value })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Particella"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.particella}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">
              Subalterno
            </p>
            {isEditing ? (
              <Input
                value={editedData.subalterno || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, subalterno: e.target.value })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Subalterno"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.subalterno || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">Sezione</p>
            {isEditing ? (
              <Input
                value={editedData.sezione || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, sezione: e.target.value })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Sezione"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.sezione || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">
              Superficie Catastale (mq)
            </p>
            {isEditing ? (
              <Input
                type="number"
                value={editedData.superficieCatastaleMq || ""}
                onChange={(e) =>
                  setEditedData({
                    ...editedData,
                    superficieCatastaleMq: Number(e.target.value),
                  })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Superficie Catastale"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.superficieCatastaleMq}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAgronomicData = (): React.ReactNode => {
    return (
      <div className="bg-gradient-to-br from-harvest-50/50 to-nature-100/30 rounded-2xl p-5 border border-harvest-200/50 shadow-sm">
        <h3 className="text-sm font-semibold text-harvest-600 mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-harvest-500"></div>
          Dati Agronomici
        </h3>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-medium text-harvest-600 mb-1.5">
              SAU (Ha)
            </p>
            {isEditing ? (
              <Input
                type="number"
                step="0.01"
                value={editedData.sauHa || ""}
                onChange={(e) =>
                  setEditedData({
                    ...editedData,
                    sauHa: Number(e.target.value),
                  })
                }
                className="bg-white/80 border-harvest-200 focus:border-harvest-400 focus:ring-harvest-300/50 rounded-xl h-10"
                placeholder="SAU"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.sauHa ? field.sauHa.toFixed(2) : "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-harvest-600 mb-1.5">
              GIS (Ha)
            </p>
            {isEditing ? (
              <Input
                type="number"
                step="0.01"
                value={editedData.gisHa || ""}
                onChange={(e) =>
                  setEditedData({
                    ...editedData,
                    gisHa: Number(e.target.value),
                  })
                }
                className="bg-white/80 border-harvest-200 focus:border-harvest-400 focus:ring-harvest-300/50 rounded-xl h-10"
                placeholder="GIS"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.gisHa ? field.gisHa.toFixed(2) : "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-harvest-600 mb-1.5">
              Tipo di Suolo
            </p>
            {isEditing ? (
              <Select
                value={editedData.soilType || ""}
                onValueChange={(value) =>
                  setEditedData({ ...editedData, soilType: value })
                }
              >
                <SelectTrigger className="bg-white/80 border-harvest-200 focus:border-harvest-400 focus:ring-harvest-300/50 rounded-xl h-10">
                  <SelectValue placeholder="Seleziona tipo suolo" />
                </SelectTrigger>
                <SelectContent>
                  {SOIL_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.soilType || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-harvest-600 mb-1.5">Uso</p>
            {isEditing ? (
              <Input
                value={editedData.uso || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, uso: e.target.value })
                }
                className="bg-white/80 border-harvest-200 focus:border-harvest-400 focus:ring-harvest-300/50 rounded-xl h-10"
                placeholder="Uso"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.uso || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-harvest-600 mb-1.5">
              Qualità
            </p>
            {isEditing ? (
              <Input
                value={editedData.qualita || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, qualita: e.target.value })
                }
                className="bg-white/80 border-harvest-200 focus:border-harvest-400 focus:ring-harvest-300/50 rounded-xl h-10"
                placeholder="Qualità"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.qualita || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-harvest-600 mb-1.5">pH</p>
            {isEditing ? (
              <Input
                type="number"
                step="0.1"
                value={editedData.ph || ""}
                onChange={(e) =>
                  setEditedData({
                    ...editedData,
                    ph: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="bg-white/80 border-harvest-200 focus:border-harvest-400 focus:ring-harvest-300/50 rounded-xl h-10"
                placeholder="pH"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.ph || "-"}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderNutrients = (): React.ReactNode => {
    return (
      <div className="bg-gradient-to-br from-field-50/50 to-agri-green-50/30 rounded-2xl p-5 border border-field-200/50 shadow-sm">
        <h3 className="text-sm font-semibold text-field-600 mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-field-500"></div>
          Elementi Nutritivi
        </h3>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">
              Azoto (N)
            </p>
            {isEditing ? (
              <Input
                type="number"
                step="0.1"
                value={editedData.nitrogen || ""}
                onChange={(e) =>
                  setEditedData({
                    ...editedData,
                    nitrogen: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Azoto"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.nitrogen || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">
              Fosforo (P)
            </p>
            {isEditing ? (
              <Input
                type="number"
                step="0.1"
                value={editedData.phosphorus || ""}
                onChange={(e) =>
                  setEditedData({
                    ...editedData,
                    phosphorus: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Fosforo"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.phosphorus || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">
              Potassio (K)
            </p>
            {isEditing ? (
              <Input
                type="number"
                step="0.1"
                value={editedData.potassium || ""}
                onChange={(e) =>
                  setEditedData({
                    ...editedData,
                    potassium: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Potassio"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.potassium || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">
              Calcio (Ca)
            </p>
            {isEditing ? (
              <Input
                type="number"
                step="0.1"
                value={editedData.calcium || ""}
                onChange={(e) =>
                  setEditedData({
                    ...editedData,
                    calcium: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Calcio"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.calcium || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">
              Magnesio (Mg)
            </p>
            {isEditing ? (
              <Input
                type="number"
                step="0.1"
                value={editedData.magnesium || ""}
                onChange={(e) =>
                  setEditedData({
                    ...editedData,
                    magnesium: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Magnesio"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.magnesium || "-"}
              </p>
            )}
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
      <div className="bg-gradient-to-br from-nature-100/50 to-agri-green-50/30 rounded-2xl p-5 border border-nature-200/50 shadow-sm">
        <h3 className="text-sm font-semibold text-nature-600 mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-nature-500"></div>
          Unità Produttive ({field.productionUnits.length})
        </h3>
        <div className="space-y-3">
          {field.productionUnits.map((unit) => (
            <div
              key={unit.id}
              className="p-3 bg-white/60 rounded-lg border border-nature-200/50 shadow-sm"
            >
              <p className="text-sm font-semibold mb-2">{unit.name}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-nature-600 font-medium">Coltura: </span>
                  <span>{unit.cropName || "-"}</span>
                </div>
                <div>
                  <span className="text-nature-600 font-medium">Varietà: </span>
                  <span>{unit.cropVariety || "-"}</span>
                </div>
                <div>
                  <span className="text-nature-600 font-medium">
                    Categoria:{" "}
                  </span>
                  <span>{unit.cropCategory || "-"}</span>
                </div>
                <div>
                  <span className="text-nature-600 font-medium">
                    SAU (Ha):{" "}
                  </span>
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
      <div className="bg-gradient-to-br from-agri-green-50/50 to-field-50/30 rounded-2xl p-5 border border-agri-green-200/50 shadow-sm">
        <h3 className="text-sm font-semibold text-agri-green-700 mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-agri-green-500"></div>
          Periodo di Conduzione
        </h3>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-medium text-agri-green-600 mb-1.5">
              Inizio Conduzione
            </p>
            {isEditing ? (
              <Input
                type="date"
                value={
                  editedData.inizioConduzione
                    ? new Date(editedData.inizioConduzione)
                        .toISOString()
                        .split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setEditedData({
                    ...editedData,
                    inizioConduzione: e.target.value || null,
                  })
                }
                className="bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.inizioConduzione
                  ? new Date(field.inizioConduzione).toLocaleDateString("it-IT")
                  : "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-agri-green-600 mb-1.5">
              Fine Conduzione
            </p>
            {isEditing ? (
              <Input
                type="date"
                value={
                  editedData.fineConduzione
                    ? new Date(editedData.fineConduzione)
                        .toISOString()
                        .split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setEditedData({
                    ...editedData,
                    fineConduzione: e.target.value || null,
                  })
                }
                className="bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {field.fineConduzione
                  ? new Date(field.fineConduzione).toLocaleDateString("it-IT")
                  : "-"}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header con pulsante modifica */}
      <div className="flex items-center justify-between pb-4 border-b border-agri-green-100/50">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? "Modifica Campo" : "Dettagli Campo"}
          </h2>
          {!isEditing && (
            <p className="text-xs text-muted-foreground mt-1">
              Tocca la matita per modificare
            </p>
          )}
        </div>
        {!isEditing && onUpdate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-9 w-9 p-0 rounded-full bg-agri-green-50 hover:bg-agri-green-100 text-agri-green-700 border border-agri-green-200/50 shadow-sm transition-all hover:shadow-md"
            aria-label="Modifica"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {isEditing && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isUpdating}
              className="h-9 px-3 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm transition-all"
            >
              <X className="h-4 w-4 mr-1" />
              Annulla
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isUpdating}
              className="h-9 px-3 rounded-full bg-agri-green-600 hover:bg-agri-green-700 text-white shadow-sm transition-all hover:shadow-md"
            >
              <Check className="h-4 w-4 mr-1" />
              {isUpdating ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        )}
      </div>

      {/* Contenuto */}
      <div className="space-y-5">
        {renderGeneralInfo()}
        {renderCadastralData()}
        {renderAgronomicData()}
        {renderNutrients()}
        {renderProductionUnits()}
        {renderConductionPeriod()}
      </div>
    </div>
  );
}
