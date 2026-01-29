import * as React from "react";
import { useState, useEffect } from "react";
import {
  type Field,
  type BulkFieldUpdateInput,
  type ProductionUnit,
} from "@/api/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type ProductionUnitInfoEntry = {
  label: string;
  value: string;
};

type ProductionUnitInfoSection = {
  title: string;
  items: ProductionUnitInfoEntry[];
};

class ProductionUnitPresenter {
  private readonly unit: ProductionUnit;

  constructor(unit: ProductionUnit) {
    this.unit = unit;
  }

  public getTitle(): string {
    return this.unit.name || "Unità senza nome";
  }

  public getSections(): ProductionUnitInfoSection[] {
    return [
      {
        title: "Informazioni colturali",
        items: [
          { label: "Coltura", value: this.unit.cropName || "-" },
          {
            label: "Categoria",
            value: this.unit.cropType || this.unit.cropCategory || "-",
          },
          {
            label: "Varietà",
            value:
              this.unit.variety ||
              this.unit.cropVariety ||
              this.unit.cropName ||
              "-",
          },
          { label: "Protocollo", value: this.unit.protocoll || "-" },
        ],
      },
      {
        title: "Struttura e superfici",
        items: [
          {
            label: "Superficie (Ha)",
            value: this.formatNumber(this.unit.areaHa ?? this.unit.sauHa),
          },
          {
            label: "Struttura protettiva",
            value: this.unit.protectionStructure || "-",
          },
          { label: "Occupazione", value: this.unit.occupazione || "-" },
          {
            label: "Destinazione d'uso",
            value: this.unit.destinazioneDiUso || "-",
          },
          {
            label: "Acqua totale (L)",
            value: this.formatNumber(this.unit.acquaTotalePeridoL, 0),
          },
        ],
      },
      {
        title: "Cronologia",
        items: [
          { label: "Inizio", value: this.formatDate(this.unit.startDate) },
          {
            label: "Fioritura",
            value: this.formatDate(this.unit.floweringDate),
          },
          {
            label: "Raccolta",
            value: this.formatDate(this.unit.harvestingDate),
          },
          { label: "Fine", value: this.formatDate(this.unit.endDate) },
        ],
      },
    ];
  }

  private formatNumber(
    value: number | null | undefined,
    maximumFractionDigits: number = 2
  ): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "-";
    }

    return value.toLocaleString("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    });
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return date.toLocaleDateString("it-IT");
  }
}

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
    bufferZoneNotes: field.bufferZoneNotes || "",
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
        bufferZoneNotes: field.bufferZoneNotes || "",
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
    if (editedData.bufferZoneNotes !== (field.bufferZoneNotes || ""))
      updateData.bufferZoneNotes = editedData.bufferZoneNotes || null;

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
      bufferZoneNotes: field.bufferZoneNotes || "",
    });
    setIsEditing(false);
  };

  const renderGeneralInfo = (): React.ReactNode => {
    return (
      <div className="border-b border-gray-100 pb-6">
        <h3 className="text-sm font-medium text-black mb-4">
          Informazioni Generali
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Azienda</p>
            <p className="text-sm text-gray-900">{field.companyName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Nome Campo
            </p>
            {isEditing ? (
              <Input
                value={editedData.name || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, name: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Nome Campo"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.name}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Indirizzo
            </p>
            {isEditing ? (
              <Input
                value={editedData.address || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, address: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Indirizzo"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.address || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Città</p>
            {isEditing ? (
              <Input
                value={editedData.city || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, city: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Città"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.city || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">CAP</p>
            {isEditing ? (
              <Input
                value={editedData.cap || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, cap: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="CAP"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.cap || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Regione</p>
            {isEditing ? (
              <Input
                value={editedData.region || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, region: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Regione"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.region || "-"}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCadastralData = (): React.ReactNode => {
    return (
      <div className="border-b border-gray-100 pb-6">
        <h3 className="text-sm font-medium text-black mb-4">Dati Catastali</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Foglio</p>
            {isEditing ? (
              <Input
                value={editedData.foglio || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, foglio: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Foglio"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.foglio || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Particella
            </p>
            {isEditing ? (
              <Input
                value={editedData.particella || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, particella: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Particella"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.particella || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Subalterno
            </p>
            {isEditing ? (
              <Input
                value={editedData.subalterno || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, subalterno: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Subalterno"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.subalterno || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Sezione</p>
            {isEditing ? (
              <Input
                value={editedData.sezione || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, sezione: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Sezione"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.sezione || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
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
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Superficie Catastale"
              />
            ) : (
              <p className="text-sm text-gray-900">
                {field.superficieCatastaleMq || "-"}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAgronomicData = (): React.ReactNode => {
    return (
      <div className="border-b border-gray-100 pb-6">
        <h3 className="text-sm font-medium text-black mb-4">Dati Agronomici</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">SAU (Ha)</p>
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
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="SAU"
              />
            ) : (
              <p className="text-sm text-gray-900">
                {field.sauHa ? field.sauHa.toFixed(2) : "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">GIS (Ha)</p>
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
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="GIS"
              />
            ) : (
              <p className="text-sm text-gray-900">
                {field.gisHa ? field.gisHa.toFixed(2) : "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Tipo di Suolo
            </p>
            {isEditing ? (
              <Select
                value={editedData.soilType || ""}
                onValueChange={(value) =>
                  setEditedData({ ...editedData, soilType: value })
                }
              >
                <SelectTrigger className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10">
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
              <p className="text-sm text-gray-900">{field.soilType || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Uso</p>
            {isEditing ? (
              <Input
                value={editedData.uso || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, uso: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Uso"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.uso || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Qualità</p>
            {isEditing ? (
              <Input
                value={editedData.qualita || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, qualita: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Qualità"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.qualita || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">pH</p>
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
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="pH"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.ph || "-"}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderNutrients = (): React.ReactNode => {
    return (
      <div className="border-b border-gray-100 pb-6">
        <h3 className="text-sm font-medium text-black mb-4">
          Elementi Nutritivi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
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
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Azoto"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.nitrogen || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
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
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Fosforo"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.phosphorus || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
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
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Potassio"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.potassium || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
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
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Calcio"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.calcium || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
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
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Magnesio"
              />
            ) : (
              <p className="text-sm text-gray-900">{field.magnesium || "-"}</p>
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
      <div className="border-b border-gray-100 pb-6">
        <h3 className="text-sm font-medium text-black mb-4">
          Unità Produttive ({field.productionUnits.length})
        </h3>
        <div className="space-y-3">
          {field.productionUnits.map((unit) => {
            const presenter = new ProductionUnitPresenter(unit);
            const sections = presenter.getSections();

            return (
              <div
                key={unit.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <p className="text-sm font-medium text-gray-900 mb-3">
                  {presenter.getTitle()}
                </p>
                <div className="space-y-3">
                  {sections.map((section) => (
                    <div key={`${unit.id}-${section.title}`}>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium mb-1.5">
                        {section.title}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {section.items.map((item) => (
                          <div
                            key={`${unit.id}-${section.title}-${item.label}`}
                          >
                            <span className="text-gray-500 font-medium">
                              {item.label}:{" "}
                            </span>
                            <span className="text-gray-900">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderConductionPeriod = (): React.ReactNode => {
    return (
      <div className="border-b border-gray-100 pb-6">
        <h3 className="text-sm font-medium text-black mb-4">
          Periodo di Conduzione
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
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
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
              />
            ) : (
              <p className="text-sm text-gray-900">
                {field.inizioConduzione
                  ? new Date(field.inizioConduzione).toLocaleDateString("it-IT")
                  : "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
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
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
              />
            ) : (
              <p className="text-sm text-gray-900">
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

  const renderBufferZoneNotes = (): React.ReactNode => {
    return (
      <div className="pb-6">
        <h3 className="text-sm font-medium text-black mb-4">
          Note Zona Buffer
        </h3>
        <div>
          {isEditing ? (
            <Textarea
              value={editedData.bufferZoneNotes || ""}
              onChange={(e) =>
                setEditedData({
                  ...editedData,
                  bufferZoneNotes: e.target.value || null,
                })
              }
              placeholder="Inserisci le note sulla zona buffer..."
              className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg min-h-[120px] resize-y"
            />
          ) : (
            <p className="text-sm text-gray-900 whitespace-pre-wrap">
              {field.bufferZoneNotes || "-"}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header con pulsante modifica */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            {isEditing ? "Modifica Campo" : "Dettagli Campo"}
          </h2>
          {!isEditing && (
            <p className="text-xs text-gray-500 mt-1">
              Tocca la matita per modificare
            </p>
          )}
        </div>
        {!isEditing && onUpdate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8 p-0 rounded-lg bg-agri-green-50 hover:bg-agri-green-100 text-black transition-all flex-shrink-0"
            aria-label="Modifica"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {isEditing && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isUpdating}
              className="h-8 px-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition-all text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Annulla
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isUpdating}
              className="h-8 px-3 rounded-lg bg-agri-green-500 hover:bg-agri-green-600 text-white transition-all text-xs"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              {isUpdating ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        )}
      </div>

      {/* Contenuto */}
      <div className="space-y-6">
        {renderGeneralInfo()}
        {renderCadastralData()}
        {renderAgronomicData()}
        {renderNutrients()}
        {renderProductionUnits()}
        {renderConductionPeriod()}
        {renderBufferZoneNotes()}
      </div>
    </div>
  );
}
