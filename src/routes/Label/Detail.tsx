import * as React from "react";
import { Link, useParams } from "react-router-dom";
import {
  type LabelDetail,
  type LabelDosaggioDettagliato,
  type LabelFieldChange,
  type LabelHistoryEntry,
  type LabelInner,
  type LabelResistenza,
} from "@/api/labels";
import { useLabel, useLabelHistory } from "@/hooks/useLabel";
import { useMe, UserRole } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { toList, parseList, buildColumns } from "@/utils/tableHelpers";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RefreshCcw, Undo2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type LabelData = LabelDetail["label"];

// Tipo per dosaggio fertilizzante
type FertilizerDosage = {
  coltura?: string;
  fase_fenologica?: string;
  dose_kg_ha?: number;
  dose_kg_ha_min?: number;
  dose_kg_ha_max?: number;
  [key: string]: unknown;
};

// Tipo per label che può contenere dati fertilizzanti
type LabelWithFertilizer = LabelInner & {
  prodotto_fertilizzante_ue?: {
    identificazione_prodotto?: Record<string, unknown>;
    composizione_garantita?: {
      analisi_principale_NPK_percentuale_peso?: Record<string, unknown>;
      meso_elementi_percentuale_peso?: Record<string, unknown>;
      solubilita_fosforo?: Record<string, unknown>;
      parametri_organici_biologici?: Record<string, unknown>;
      forme_azoto?: unknown[];
      micronutrienti?: unknown[];
    };
    istruzioni_uso_agronomiche?: {
      uso_previsto?: string;
      frequenza?: string;
      condizioni_stoccaggio?: string;
      dosi_applicazione?: {
        specifiche_coltura?: FertilizerDosage[];
      };
    };
    informazioni_sicurezza_clp?: {
      avvertenza?: string;
      note_mediche?: string;
      pittogrammi_pericolo?: unknown[];
      indicazioni_pericolo_H?: unknown[];
      consigli_prudenza_P?: unknown[];
    };
  };
};

class ResistanceAdapter {
  public static toNumber(value: unknown): number | undefined {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  public static normalize(value: LabelInner["resistenze"]): LabelResistenza[] {
    if (!value || !Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item === "string") {
          return { testo_completo: item };
        }
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return {
            testo_completo:
              typeof obj.testo_completo === "string" ? obj.testo_completo : "",
            raccomandazioni:
              typeof obj.raccomandazioni === "string"
                ? obj.raccomandazioni
                : "",
            n_max_applicazioni: this.toNumber(obj.n_max_applicazioni),
            n_min_applicazioni: this.toNumber(obj.n_min_applicazioni),
            n_max_applicazioni_um:
              typeof obj.n_max_applicazioni_um === "string"
                ? obj.n_max_applicazioni_um
                : "",
            n_min_applicazioni_um:
              typeof obj.n_min_applicazioni_um === "string"
                ? obj.n_min_applicazioni_um
                : "",
          };
        }
        return { testo_completo: String(item) };
      })
      .filter((r) =>
        Object.values(r).some((val) => val !== undefined && val !== "")
      );
  }

  public static summary(resistenze: LabelResistenza[]): string {
    return resistenze
      .map((r) => r.testo_completo || r.raccomandazioni || "")
      .filter(Boolean)
      .join(" | ");
  }
}

// Fertilizer specific columns
const buildFertilizerColumns = (): EditableColumn[] =>
  buildColumns<Record<string, unknown>>([
    // Identificazione Prodotto
    { id: "nome_commerciale", title: "Nome Commerciale", type: "text" },
    { id: "funzione_categoria", title: "Funzione/Categoria", type: "text" },
    { id: "numero_lotto", title: "Numero Lotto", type: "text" },
    { id: "stato_fisico", title: "Stato Fisico", type: "text" },
    {
      id: "confezioni_disponibili",
      title: "Confezioni Disponibili",
      type: "text",
    },
    { id: "quantita_nominale", title: "Quantità Nominale", type: "text" },
    // NPK
    { id: "n_totale", title: "N Totale (%)", type: "number" },
    { id: "p2o5_totale", title: "P2O5 Totale (%)", type: "number" },
    { id: "k2o_totale", title: "K2O Totale (%)", type: "number" },
    // Meso elementi
    { id: "cao_totale", title: "CaO Totale (%)", type: "number" },
    { id: "mgo_totale", title: "MgO Totale (%)", type: "number" },
    { id: "so3_totale", title: "SO3 Totale (%)", type: "number" },
    { id: "na2o_totale", title: "Na2O Totale (%)", type: "number" },
    // Forme Azoto
    { id: "forme_azoto", title: "Forme Azoto", type: "text" },
    // Solubilità Fosforo
    {
      id: "p2o5_solubile_acqua",
      title: "P2O5 Solubile Acqua (%)",
      type: "number",
    },
    {
      id: "p2o5_solubile_citrato",
      title: "P2O5 Solubile Citrato (%)",
      type: "number",
    },
    // Micronutrienti
    { id: "micronutrienti", title: "Micronutrienti", type: "text" },
    // Parametri organici
    { id: "carbonio_organico", title: "Carbonio Organico (%)", type: "number" },
    {
      id: "acidi_umici_fulvici",
      title: "Acidi Umici/Fulvici (%)",
      type: "number",
    },
    { id: "sostanza_organica", title: "Sostanza Organica (%)", type: "number" },
    // Istruzioni uso
    { id: "uso_previsto", title: "Uso Previsto", type: "text" },
    { id: "frequenza", title: "Frequenza", type: "text" },
    {
      id: "condizioni_stoccaggio",
      title: "Condizioni Stoccaggio",
      type: "text",
    },
    // Sicurezza
    { id: "avvertenza", title: "Avvertenza", type: "text" },
    { id: "pittogrammi_pericolo", title: "Pittogrammi Pericolo", type: "text" },
    {
      id: "indicazioni_pericolo",
      title: "Indicazioni Pericolo (H)",
      type: "text",
    },
    { id: "consigli_prudenza", title: "Consigli Prudenza (P)", type: "text" },
    { id: "note_mediche", title: "Note Mediche", type: "text" },
  ]);

const toFertilizerRow = (detail: LabelDetail): Record<string, unknown> => {
  const fert =
    (detail.label as LabelWithFertilizer)?.prodotto_fertilizzante_ue || {};
  const ident = fert.identificazione_prodotto || {};
  const comp = fert.composizione_garantita || {};
  const npk = comp.analisi_principale_NPK_percentuale_peso || {};
  const meso = comp.meso_elementi_percentuale_peso || {};
  const solFosforo = comp.solubilita_fosforo || {};
  const paramOrg = comp.parametri_organici_biologici || {};
  const instr = fert.istruzioni_uso_agronomiche || {};
  const sicurezza = fert.informazioni_sicurezza_clp || {};

  // Helper per formattare array come stringa
  const formatArray = (arr: unknown[] | null | undefined): string => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return "";
    return arr
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          // Per forme_azoto: { tipo, percentuale }
          if (obj.tipo && obj.percentuale !== undefined) {
            return `${obj.tipo}: ${obj.percentuale}%`;
          }
          // Per micronutrienti: { elemento, percentuale }
          if (obj.elemento && obj.percentuale !== undefined) {
            return `${obj.elemento}: ${obj.percentuale}%`;
          }
          return JSON.stringify(item);
        }
        return String(item);
      })
      .join(", ");
  };

  // Helper per quantità nominale
  const formatQuantitaNominale = (qn: unknown): string => {
    if (!qn || typeof qn !== "object") return "";
    const qnObj = qn as Record<string, unknown>;
    if (qnObj.valore && qnObj.unita) {
      return `${qnObj.valore} ${qnObj.unita}`;
    }
    return "";
  };

  return {
    // Identificazione Prodotto
    nome_commerciale: ident.nome_commerciale ?? "",
    funzione_categoria: ident.funzione_categoria_prodotto ?? "",
    numero_lotto: ident.numero_lotto ?? "",
    stato_fisico: ident.stato_fisico ?? "",
    confezioni_disponibili: formatArray(
      Array.isArray(ident.confezioni_disponibili)
        ? ident.confezioni_disponibili
        : undefined
    ),
    quantita_nominale: formatQuantitaNominale(ident.quantita_nominale),
    // NPK
    n_totale: npk.N_totale ?? "",
    p2o5_totale: npk.P2O5_totale ?? "",
    k2o_totale: npk.K2O_totale ?? "",
    // Meso elementi
    cao_totale: meso.CaO_totale ?? "",
    mgo_totale: meso.MgO_totale ?? "",
    so3_totale: meso.SO3_totale ?? "",
    na2o_totale: meso.Na2O_totale ?? "",
    // Forme Azoto
    forme_azoto: formatArray(comp.forme_azoto),
    // Solubilità Fosforo
    p2o5_solubile_acqua: solFosforo.P2O5_solubile_acqua ?? "",
    p2o5_solubile_citrato:
      solFosforo.P2O5_solubile_citrato_ammonio_neutro ?? "",
    // Micronutrienti
    micronutrienti: formatArray(comp.micronutrienti),
    // Parametri organici
    carbonio_organico: paramOrg.carbonio_organico_biologico ?? "",
    acidi_umici_fulvici: paramOrg.acidi_umici_fulvici ?? "",
    sostanza_organica: paramOrg.sostanza_organica ?? "",
    // Istruzioni uso
    uso_previsto: instr.uso_previsto ?? "",
    frequenza: instr.frequenza ?? "",
    condizioni_stoccaggio: instr.condizioni_stoccaggio ?? "",
    // Sicurezza
    avvertenza: sicurezza.avvertenza ?? "",
    pittogrammi_pericolo: formatArray(sicurezza.pittogrammi_pericolo),
    indicazioni_pericolo: formatArray(sicurezza.indicazioni_pericolo_H),
    consigli_prudenza: formatArray(sicurezza.consigli_prudenza_P),
    note_mediche: sicurezza.note_mediche ?? "",
  };
};

const buildLabelColumns = (): EditableColumn[] =>
  buildColumns<LabelData>([
    { id: "prodotto", title: "Prodotto", type: "text", required: false },
    { id: "categoria", title: "Categoria", type: "text" },
    { id: "formulazione", title: "Formulazione", type: "text" },
    { id: "principio_attivo", title: "Principio attivo", type: "text" },
    { id: "composizione", title: "Composizione", type: "text" },
    {
      id: "meccanismo_azione_frac",
      title: "Meccanismo azione (FRAC)",
      type: "text",
    },
    { id: "malattie", title: "Malattie", type: "text" },
    { id: "specie", title: "Specie", type: "text" },
    { id: "colture_target", title: "Colture target", type: "text" },
    {
      id: "colture_target_fuori_periodo_di_prodizione",
      title: "Colture target fuori periodo di produzione",
      type: "text",
    },
    { id: "numero_registrazione", title: "N. registrazione", type: "text" },
    { id: "titolare", title: "Titolare", type: "text" },
    { id: "stabilimento", title: "Stabilimento", type: "text" },
    { id: "caratteristiche", title: "Caratteristiche", type: "text" },
    { id: "avvertenze", title: "Avvertenze", type: "text" },
    { id: "frasi_pericolo", title: "Frasi pericolo", type: "text" },
    { id: "frasi_prudenza", title: "Frasi prudenza", type: "text" },
    { id: "compatibilita", title: "Compatibilità", type: "text" },
    { id: "note_tecniche", title: "Note tecniche", type: "text" },
    { id: "fitotossicita", title: "Fitotossicità", type: "text" },
    {
      id: "fasce_di_rispetto_e_deriva",
      title: "Fasce di rispetto e deriva",
      type: "text",
    },
  ]);

const toLabelRow = (detail: LabelDetail): Record<string, unknown> => {
  const l = (detail.label || {}) as Record<string, unknown>;
  return {
    prodotto: String(l.prodotto ?? detail.productName ?? ""),
    categoria: String(l.categoria ?? ""),
    formulazione: String(l.formulazione ?? ""),
    principio_attivo: String(l.principio_attivo ?? ""),
    composizione: String(l.composizione ?? ""),
    meccanismo_azione_frac: String(l.meccanismo_azione_frac ?? ""),
    malattie: toList(l.malattie),
    specie: toList(l.specie),
    colture_target: toList(l.colture_target),
    colture_target_fuori_periodo_di_prodizione: toList(
      l.colture_target_fuori_periodo_di_prodizione
    ),
    numero_registrazione: String(
      l.numero_registrazione ?? detail.registrationNumber ?? ""
    ),
    titolare: String(l.titolare ?? ""),
    stabilimento: String(l.stabilimento ?? ""),
    caratteristiche: String(l.caratteristiche ?? ""),
    avvertenze: toList(l.avvertenze),
    frasi_pericolo: toList(l.frasi_pericolo),
    frasi_prudenza: toList(l.frasi_prudenza),
    compatibilita: String(l.compatibilita ?? ""),
    note_tecniche: String(l.note_tecniche ?? ""),
    fitotossicita: String(l.fitotossicita ?? ""),
    fasce_di_rispetto_e_deriva: toList(l.fasce_di_rispetto_e_deriva),
  };
};

const countFilledFields = (d: LabelDosaggioDettagliato): string => {
  const fields = [
    d.coltura,
    d.malattia,
    d.dose_minima,
    d.dose_massima,
    d.dose_um,
    d.acqua_max,
    d.acqua_max_um,
    d.n_max_applicazioni,
    d.n_max_applicazioni_um,
    d.intervallo_min_giorni,
    d.intervallo_sicurezza_giorni,
    d.epoca_impiego,
    d.modalita_applicazione,
    d.istruzioni,
  ];
  const filled = fields.filter((f) => {
    if (typeof f === "string") return f.trim().length > 0;
    if (typeof f === "number") return f > 0;
    return false;
  }).length;
  return `${filled}/${fields.length}`;
};

// --- History Components ---

function LabelChangeRow({ change }: { change: LabelFieldChange }) {
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Si" : "No";
    if (typeof value === "object") {
      const json = JSON.stringify(value);
      return json.length > 80 ? `${json.slice(0, 80)}…` : json;
    }
    const str = String(value);
    return str.length > 80 ? `${str.slice(0, 80)}…` : str;
  };

  return (
    <div className="flex flex-col gap-0.5 py-1.5 px-2 bg-gray-50 rounded text-xs border-l-2 border-gray-200">
      <span className="font-medium text-gray-700">{change.field}</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-gray-400 line-through truncate max-w-[160px]">
          {formatValue(change.oldValue)}
        </span>
        <span className="text-gray-400">&rarr;</span>
        <span className="text-gray-700 font-medium truncate max-w-[160px]">
          {formatValue(change.newValue)}
        </span>
      </div>
    </div>
  );
}

function LabelHistoryCard({
  entry,
  isAdmin,
  isRollingBack,
  onRollback,
}: {
  entry: LabelHistoryEntry;
  isAdmin: boolean;
  isRollingBack: boolean;
  onRollback: (historyId: string) => Promise<unknown>;
}) {
  const initials = entry.userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const formattedDate = new Date(entry.createdAt).toLocaleString("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-white">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          {entry.userProfilePictureUrl ? (
            <AvatarImage
              src={entry.userProfilePictureUrl}
              alt={entry.userName}
            />
          ) : null}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {entry.userName}
          </p>
          <p className="text-xs text-gray-500">{formattedDate}</p>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          {entry.changes.length}{" "}
          {entry.changes.length === 1 ? "modifica" : "modifiche"}
        </Badge>
      </div>

      {entry.changes.length > 0 && (
        <div className="space-y-1.5">
          {entry.changes.map((change, idx) => (
            <LabelChangeRow key={`${entry.id}-${idx}`} change={change} />
          ))}
        </div>
      )}

      {isAdmin && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isRollingBack}
            >
              {isRollingBack ? (
                <Spinner size={14} ariaLabel="Rollback in corso" />
              ) : (
                <>
                  <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                  Ripristina questa versione
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma ripristino</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione ripristinerà l&apos;etichetta alla versione del{" "}
                {formattedDate}. Le modifiche successive andranno perse.
                Continuare?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await onRollback(entry.id);
                  } catch {
                    /* handled in mutation */
                  }
                }}
              >
                Ripristina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default function LabelDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const [view, setView] = React.useState<"dati" | "dosaggi">("dati");
  const [viewMode, setViewMode] = React.useState<"table" | "json">("table");

  // Permessi utente
  const { data: userData } = useMe();
  const userRole = userData?.role;
  const canModify = userRole === UserRole.ADMIN || userRole === UserRole.LABEL_MANAGER;
  const isAdmin = userRole === UserRole.ADMIN;

  const {
    detail,
    isLoading,
    error,
    saveAsync,
    isSaving,
    verifyAsync,
    isVerifying,
    confirmAsync,
    isConfirming,
    extractWithMistralAsync,
    isExtracting,
    extractWithGptAsync,
    isExtractingGpt,
  } = useLabel({ id });

  const [historyDrawerOpen, setHistoryDrawerOpen] = React.useState(false);
  const { history, isLoadingHistory, rollbackAsync, isRollingBack } =
    useLabelHistory({ labelExtractionId: id, enabled: historyDrawerOpen });

  const [labelJson, setLabelJson] = React.useState<string>("{}");
  const [dosaggiJson, setDosaggiJson] = React.useState<string[]>([]);
  const [editedDosaggi, setEditedDosaggi] = React.useState<
    LabelDosaggioDettagliato[]
  >([]);
  const [editedResistenze, setEditedResistenze] = React.useState<
    LabelResistenza[]
  >([]);

  React.useEffect(() => {
    if (!detail) return;
    setLabelJson(JSON.stringify(detail.label ?? {}, null, 2));
    setDosaggiJson(
      (detail.label?.dosaggi_dettagliati ?? []).map((d) =>
        JSON.stringify(d, null, 2)
      )
    );
    setEditedDosaggi(detail.label?.dosaggi_dettagliati ?? []);
    setEditedResistenze(ResistanceAdapter.normalize(detail.label?.resistenze));
  }, [detail]);

  const isFertilizer = Boolean(
    detail && (detail.label as LabelWithFertilizer)?.prodotto_fertilizzante_ue
  );

  const columns = React.useMemo(
    () => (isFertilizer ? buildFertilizerColumns() : buildLabelColumns()),
    [isFertilizer]
  );

  const rowData = React.useMemo(() => {
    if (!detail) return {};
    return isFertilizer ? toFertilizerRow(detail) : toLabelRow(detail);
  }, [detail, isFertilizer]);

  // Fertilizer Dosages
  const fertilizerDosages = React.useMemo(
    () =>
      (detail?.label as LabelWithFertilizer)?.prodotto_fertilizzante_ue
        ?.istruzioni_uso_agronomiche?.dosi_applicazione?.specifiche_coltura ??
      [],
    [detail]
  );

  const normalizedResistenze = React.useMemo(
    () => ResistanceAdapter.normalize(detail?.label?.resistenze),
    [detail]
  );

  const hasEditedResistenzeChanges = React.useMemo(
    () =>
      JSON.stringify(editedResistenze) !== JSON.stringify(normalizedResistenze),
    [editedResistenze, normalizedResistenze]
  );

  const [editedFertilizerDosages, setEditedFertilizerDosages] = React.useState<
    FertilizerDosage[]
  >([]);

  React.useEffect(() => {
    if (!detail) return;
    if (isFertilizer) {
      setEditedFertilizerDosages(fertilizerDosages);
    }
  }, [detail, isFertilizer, fertilizerDosages]);

  return (
    <div className="p-4 md:p-6 h-full overflow-hidden flex flex-col">
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/label">Etichette</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate max-w-[150px] md:max-w-none">
              {detail?.productName ?? "Dettaglio"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header section - stacked on mobile */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Title and verification status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold leading-tight">
              {detail
                ? `${detail.productName} - no. ${detail.registrationNumber}`
                : ""}
            </h1>
            {detail ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 self-start">
                {canModify ? (
                  <Checkbox
                    id="is-verified"
                    checked={detail.isVerified}
                    disabled={isVerifying}
                    onCheckedChange={async (checked) => {
                      try {
                        await verifyAsync(Boolean(checked));
                      } catch {
                        /* handled in mutation */
                      }
                    }}
                  />
                ) : null}
                <label
                  htmlFor="is-verified"
                  className={`text-sm font-medium whitespace-nowrap ${
                    canModify ? "cursor-pointer" : ""
                  } ${detail.isVerified ? "text-green-700" : "text-gray-600"}`}
                >
                  {detail.isVerified ? "✓ Verificata" : "Non verificata"}
                </label>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {detail?.rawText && canModify ? (
              <Drawer direction="right">
                <DrawerTrigger asChild>
                  <button className="text-xs cursor-pointer text-gray-500 hover:text-gray-700 underline">
                    Estratto
                  </button>
                </DrawerTrigger>
              <DrawerContent className="max-w-[900px] h-full flex flex-col">
                <DrawerHeader className="border-b shrink-0">
                  <DrawerTitle>Testo estratto</DrawerTitle>
                  <DrawerDescription>
                    Testo grezzo estratto dall&apos;etichetta
                  </DrawerDescription>
                </DrawerHeader>
                <ScrollArea className="flex-1 p-4 min-h-0">
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed break-words">
                    {detail.rawText}
                  </pre>
                </ScrollArea>
                <div className="border-t p-4 flex justify-between items-center shrink-0 gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          await extractWithMistralAsync();
                        } catch {
                          /* handled in mutation */
                        }
                      }}
                      disabled={isExtracting}
                    >
                      {isExtracting ? (
                        <>
                          <Spinner size={16} ariaLabel="Estrazione in corso" />
                          <span className="ml-2">Estrazione in corso...</span>
                        </>
                      ) : (
                        "Estrai nuovamente"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          await extractWithGptAsync();
                        } catch {
                          /* handled in mutation */
                        }
                      }}
                      disabled={isExtractingGpt}
                    >
                      {isExtractingGpt ? (
                        <>
                          <Spinner
                            size={16}
                            ariaLabel="Estrazione GPT in corso"
                          />
                          <span className="ml-2">Estrazione in corso...</span>
                        </>
                      ) : (
                        "Estrai testo con llm"
                      )}
                    </Button>
                  </div>
                  <DrawerClose asChild>
                    <Button variant="outline">Chiudi</Button>
                  </DrawerClose>
                </div>
              </DrawerContent>
              </Drawer>
            ) : null}
            {canModify && (
              <Drawer
                direction="right"
                open={historyDrawerOpen}
                onOpenChange={setHistoryDrawerOpen}
              >
                <DrawerTrigger asChild>
                  <button className="text-xs cursor-pointer text-gray-500 hover:text-gray-700 underline">
                    Cronologia
                  </button>
                </DrawerTrigger>
                <DrawerContent className="max-w-[480px] h-full flex flex-col">
                  <DrawerHeader className="border-b shrink-0">
                    <DrawerTitle>Cronologia modifiche</DrawerTitle>
                    <DrawerDescription>
                      Storico delle versioni precedenti dell&apos;etichetta
                    </DrawerDescription>
                  </DrawerHeader>

                  <ScrollArea className="flex-1 min-h-0">
                    {isLoadingHistory ? (
                      <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                        <Spinner
                          size={20}
                          ariaLabel="Caricamento cronologia"
                        />
                        <span>Caricamento cronologia…</span>
                      </div>
                    ) : history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <History className="h-12 w-12 mb-3" />
                        <p className="text-sm">Nessuna modifica registrata</p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-4">
                        {history.map((entry) => (
                          <LabelHistoryCard
                            key={entry.id}
                            entry={entry}
                            isAdmin={isAdmin}
                            isRollingBack={isRollingBack}
                            onRollback={rollbackAsync}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  <div className="border-t p-4 flex justify-end shrink-0">
                    <DrawerClose asChild>
                      <Button variant="outline">Chiudi</Button>
                    </DrawerClose>
                  </div>
                </DrawerContent>
              </Drawer>
            )}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "table" | "json")}
          >
            <SelectTrigger className="w-[130px] md:w-40">
              <SelectValue placeholder="Vista" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="table">Vista tabella</SelectItem>
              <SelectItem value="json">Vista JSON</SelectItem>
            </SelectContent>
          </Select>
          <div className="inline-flex p-1 bg-gray-100 rounded-lg gap-1">
            <button
              onClick={() => setView("dati")}
              className={`px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === "dati"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Dettagli
            </button>
            <button
              onClick={() => setView("dosaggi")}
              className={`px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === "dosaggi"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Dosaggi
            </button>
          </div>
          {canModify && (
            <Button
              onClick={async () => {
                try {
                  await confirmAsync();
                } catch {
                  /* handled in mutation */
                }
              }}
              disabled={isConfirming || !detail}
              className="ml-auto"
            >
              {isConfirming ? (
                <Spinner size={16} ariaLabel="Aggiornamento in corso" />
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Aggiorna
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size={20} ariaLabel="Caricamento dettaglio" />
          <span>Caricamento dettaglio…</span>
        </div>
      ) : error || !detail ? (
        <div className="text-sm text-red-600">
          Impossibile caricare il dettaglio.
        </div>
      ) : (
        <div className="flex flex-col md:grid md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Mobile PDF toggle */}
          <div className="md:hidden">
            <Accordion type="single" collapsible>
              <AccordionItem value="pdf" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <span className="text-sm font-medium">
                    📄 Visualizza PDF etichetta
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {String(detail.sourceUrl || "").length > 0 ? (
                    <div className="w-full h-[400px] border-t overflow-hidden">
                      <iframe
                        title="Label PDF Mobile"
                        src={String(detail.sourceUrl)}
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-gray-600">
                      PDF non disponibile.
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="flex-1 md:h-full min-h-0 overflow-y-auto pr-1">
            {view === "dati" ? (
              viewMode === "table" ? (
                <>
                  <EditableTable
                    columns={columns}
                    rows={[rowData]}
                    isModify={canModify}
                    isVertical={true}
                    getRowId={() => "row-0"}
                    onSave={canModify ? async ({ updated }) => {
                      try {
                        const row = updated?.[0] ?? {};

                        if (isFertilizer) {
                          const currentLabel =
                            detail.label as LabelWithFertilizer;
                          const fert =
                            currentLabel.prodotto_fertilizzante_ue || {};
                          const ident = fert.identificazione_prodotto || {};
                          const comp = fert.composizione_garantita || {};
                          const npk =
                            comp.analisi_principale_NPK_percentuale_peso || {};
                          const meso =
                            comp.meso_elementi_percentuale_peso || {};
                          const solFosforo = comp.solubilita_fosforo || {};
                          const paramOrg =
                            comp.parametri_organici_biologici || {};
                          const instr = fert.istruzioni_uso_agronomiche || {};
                          const sicurezza =
                            fert.informazioni_sicurezza_clp || {};

                          // Helper per convertire in numero o null
                          const toNumberOrNull = (
                            val: unknown
                          ): number | null => {
                            if (val === "" || val === null || val === undefined)
                              return null;
                            const num = Number(val);
                            return isNaN(num) ? null : num;
                          };

                          // Helper per convertire stringa in array
                          const parseConfezioni = (val: string): string[] => {
                            if (!val || typeof val !== "string") {
                              return Array.isArray(ident.confezioni_disponibili)
                                ? (ident.confezioni_disponibili as string[])
                                : [];
                            }
                            return val
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                          };

                          const payloadLabel = {
                            ...currentLabel,
                            prodotto_fertilizzante_ue: {
                              ...fert,
                              identificazione_prodotto: {
                                ...ident,
                                nome_commerciale:
                                  row.nome_commerciale ??
                                  ident.nome_commerciale,
                                funzione_categoria_prodotto:
                                  row.funzione_categoria ??
                                  ident.funzione_categoria_prodotto,
                                numero_lotto:
                                  row.numero_lotto || ident.numero_lotto,
                                stato_fisico:
                                  row.stato_fisico || ident.stato_fisico,
                                confezioni_disponibili: parseConfezioni(
                                  row.confezioni_disponibili as string
                                ),
                              },
                              composizione_garantita: {
                                ...comp,
                                analisi_principale_NPK_percentuale_peso: {
                                  ...npk,
                                  N_totale:
                                    toNumberOrNull(row.n_totale) ??
                                    npk.N_totale,
                                  P2O5_totale:
                                    toNumberOrNull(row.p2o5_totale) ??
                                    npk.P2O5_totale,
                                  K2O_totale:
                                    toNumberOrNull(row.k2o_totale) ??
                                    npk.K2O_totale,
                                },
                                meso_elementi_percentuale_peso: {
                                  ...meso,
                                  CaO_totale:
                                    toNumberOrNull(row.cao_totale) ??
                                    meso.CaO_totale,
                                  MgO_totale:
                                    toNumberOrNull(row.mgo_totale) ??
                                    meso.MgO_totale,
                                  SO3_totale:
                                    toNumberOrNull(row.so3_totale) ??
                                    meso.SO3_totale,
                                  Na2O_totale:
                                    toNumberOrNull(row.na2o_totale) ??
                                    meso.Na2O_totale,
                                },
                                solubilita_fosforo: {
                                  ...solFosforo,
                                  P2O5_solubile_acqua:
                                    toNumberOrNull(row.p2o5_solubile_acqua) ??
                                    solFosforo.P2O5_solubile_acqua,
                                  P2O5_solubile_citrato_ammonio_neutro:
                                    toNumberOrNull(row.p2o5_solubile_citrato) ??
                                    solFosforo.P2O5_solubile_citrato_ammonio_neutro,
                                },
                                parametri_organici_biologici: {
                                  ...paramOrg,
                                  carbonio_organico_biologico:
                                    toNumberOrNull(row.carbonio_organico) ??
                                    paramOrg.carbonio_organico_biologico,
                                  acidi_umici_fulvici:
                                    toNumberOrNull(row.acidi_umici_fulvici) ??
                                    paramOrg.acidi_umici_fulvici,
                                  sostanza_organica:
                                    toNumberOrNull(row.sostanza_organica) ??
                                    paramOrg.sostanza_organica,
                                },
                              },
                              istruzioni_uso_agronomiche: {
                                ...instr,
                                uso_previsto:
                                  row.uso_previsto ?? instr.uso_previsto,
                                frequenza: row.frequenza ?? instr.frequenza,
                                condizioni_stoccaggio:
                                  row.condizioni_stoccaggio ??
                                  instr.condizioni_stoccaggio,
                              },
                              informazioni_sicurezza_clp: {
                                ...sicurezza,
                                avvertenza:
                                  row.avvertenza ?? sicurezza.avvertenza,
                                note_mediche:
                                  row.note_mediche || sicurezza.note_mediche,
                              },
                            },
                          };
                          await saveAsync({ label: payloadLabel });
                          return;
                        }

                        const payloadLabel = {
                          ...detail.label,
                          prodotto: String(
                            row.prodotto ?? detail.label?.prodotto ?? ""
                          ),
                          categoria: String(
                            row.categoria ?? detail.label?.categoria ?? ""
                          ),
                          formulazione: String(
                            row.formulazione ?? detail.label?.formulazione ?? ""
                          ),
                          principio_attivo: String(
                            row.principio_attivo ??
                              detail.label?.principio_attivo ??
                              ""
                          ),
                          composizione: String(
                            row.composizione ?? detail.label?.composizione ?? ""
                          ),
                          meccanismo_azione_frac: String(
                            row.meccanismo_azione_frac ??
                              detail.label?.meccanismo_azione_frac ??
                              ""
                          ),
                          malattie:
                            parseList(row.malattie) ??
                            detail.label?.malattie ??
                            [],
                          specie:
                            parseList(row.specie) ?? detail.label?.specie ?? [],
                          colture_target:
                            parseList(row.colture_target) ??
                            detail.label?.colture_target ??
                            [],
                          colture_target_fuori_periodo_di_prodizione:
                            parseList(
                              row.colture_target_fuori_periodo_di_prodizione
                            ) ??
                            detail.label
                              ?.colture_target_fuori_periodo_di_prodizione ??
                            null,
                          numero_registrazione: String(
                            row.numero_registrazione ??
                              detail.label?.numero_registrazione ??
                              detail.registrationNumber ??
                              ""
                          ),
                          titolare: String(
                            row.titolare ?? detail.label?.titolare ?? ""
                          ),
                          stabilimento: String(
                            row.stabilimento ?? detail.label?.stabilimento ?? ""
                          ),
                          caratteristiche: String(
                            row.caratteristiche ??
                              detail.label?.caratteristiche ??
                              ""
                          ),
                          avvertenze:
                            parseList(row.avvertenze) ??
                            detail.label?.avvertenze ??
                            [],
                          frasi_pericolo:
                            parseList(row.frasi_pericolo) ??
                            detail.label?.frasi_pericolo ??
                            [],
                          frasi_prudenza:
                            parseList(row.frasi_prudenza) ??
                            detail.label?.frasi_prudenza ??
                            [],
                          compatibilita: String(
                            row.compatibilita ??
                              detail.label?.compatibilita ??
                              ""
                          ),
                          note_tecniche: String(
                            row.note_tecniche ??
                              detail.label?.note_tecniche ??
                              ""
                          ),
                          fitotossicita:
                            row.fitotossicita !== undefined &&
                            row.fitotossicita !== ""
                              ? String(row.fitotossicita)
                              : detail.label?.fitotossicita ?? null,
                          resistenze: detail.label?.resistenze ?? [],
                          fasce_di_rispetto_e_deriva:
                            parseList(row.fasce_di_rispetto_e_deriva) ??
                            detail.label?.fasce_di_rispetto_e_deriva ??
                            [],
                        };
                        await saveAsync({ label: payloadLabel });
                      } catch {
                        /* handled in mutation */
                      }
                    } : undefined}
                    className="bg-background"
                    exportFileName="etichetta_dettaglio"
                  />

                  {!isFertilizer ? (
                    <div className="mt-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h2 className="text-base font-semibold">Resistenze</h2>
                        {canModify && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() =>
                                setEditedResistenze((prev) => [...prev, {}])
                              }
                              disabled={isSaving || !detail}
                            >
                              Aggiungi resistenza
                            </Button>
                            {hasEditedResistenzeChanges ? (
                              <>
                                <Button
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() =>
                                    setEditedResistenze(normalizedResistenze)
                                  }
                                  disabled={isSaving}
                                >
                                  Annulla
                                </Button>
                                <Button
                                  className="w-full sm:w-auto"
                                  onClick={async () => {
                                    if (!detail) return;
                                    try {
                                      await saveAsync({
                                        label: {
                                          ...detail.label,
                                          resistenze: editedResistenze,
                                        },
                                      });
                                    } catch {
                                      /* handled in mutation */
                                    }
                                  }}
                                  disabled={isSaving}
                                >
                                  {isSaving ? "Salvataggio…" : "Salva"}
                                </Button>
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {editedResistenze.length > 0 ? (
                        <Accordion type="multiple" className="space-y-2">
                          {editedResistenze.map((resistenza, idx) => (
                            <AccordionItem
                              key={idx}
                              value={`resistenza-${idx}`}
                              className="border rounded-lg px-3 md:px-4"
                            >
                              <AccordionTrigger className="hover:no-underline py-3">
                                <span className="text-left flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 whitespace-normal break-words">
                                  <span className="font-semibold">
                                    Resistenza #{idx + 1}
                                  </span>
                                  <span className="text-muted-foreground text-xs sm:text-sm whitespace-normal break-words">
                                    {ResistanceAdapter.summary([resistenza]) ||
                                      "Dettagli non specificati"}
                                  </span>
                                </span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <Card className="shadow-none border-0">
                                  <CardContent className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                      <Label
                                        htmlFor={`resistenza-testo-${idx}`}
                                      >
                                        Testo completo
                                      </Label>
                                      <Textarea
                                        id={`resistenza-testo-${idx}`}
                                        value={resistenza.testo_completo ?? ""}
                                        onChange={(e) => {
                                          const next = [...editedResistenze];
                                          next[idx] = {
                                            ...next[idx],
                                            testo_completo: e.target.value,
                                          };
                                          setEditedResistenze(next);
                                        }}
                                        className="min-h-[120px]"
                                        readOnly={!canModify}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label
                                        htmlFor={`resistenza-raccomandazioni-${idx}`}
                                      >
                                        Raccomandazioni
                                      </Label>
                                      <Textarea
                                        id={`resistenza-raccomandazioni-${idx}`}
                                        value={resistenza.raccomandazioni ?? ""}
                                        onChange={(e) => {
                                          const next = [...editedResistenze];
                                          next[idx] = {
                                            ...next[idx],
                                            raccomandazioni: e.target.value,
                                          };
                                          setEditedResistenze(next);
                                        }}
                                        className="min-h-[100px]"
                                        readOnly={!canModify}
                                      />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label
                                          htmlFor={`resistenza-n-max-${idx}`}
                                        >
                                          N. max applicazioni
                                        </Label>
                                        <Input
                                          id={`resistenza-n-max-${idx}`}
                                          type="number"
                                          value={
                                            resistenza.n_max_applicazioni ?? ""
                                          }
                                          onChange={(e) => {
                                            const next = [...editedResistenze];
                                            next[idx] = {
                                              ...next[idx],
                                              n_max_applicazioni:
                                                e.target.value === ""
                                                  ? undefined
                                                  : Number(e.target.value),
                                            };
                                            setEditedResistenze(next);
                                          }}
                                          readOnly={!canModify}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label
                                          htmlFor={`resistenza-n-min-${idx}`}
                                        >
                                          N. min applicazioni
                                        </Label>
                                        <Input
                                          id={`resistenza-n-min-${idx}`}
                                          type="number"
                                          value={
                                            resistenza.n_min_applicazioni ?? ""
                                          }
                                          onChange={(e) => {
                                            const next = [...editedResistenze];
                                            next[idx] = {
                                              ...next[idx],
                                              n_min_applicazioni:
                                                e.target.value === ""
                                                  ? undefined
                                                  : Number(e.target.value),
                                            };
                                            setEditedResistenze(next);
                                          }}
                                          readOnly={!canModify}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label
                                          htmlFor={`resistenza-n-max-um-${idx}`}
                                        >
                                          N. max applicazioni UM
                                        </Label>
                                        <Input
                                          id={`resistenza-n-max-um-${idx}`}
                                          value={
                                            resistenza.n_max_applicazioni_um ??
                                            ""
                                          }
                                          onChange={(e) => {
                                            const next = [...editedResistenze];
                                            next[idx] = {
                                              ...next[idx],
                                              n_max_applicazioni_um:
                                                e.target.value,
                                            };
                                            setEditedResistenze(next);
                                          }}
                                          readOnly={!canModify}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label
                                          htmlFor={`resistenza-n-min-um-${idx}`}
                                        >
                                          N. min applicazioni UM
                                        </Label>
                                        <Input
                                          id={`resistenza-n-min-um-${idx}`}
                                          value={
                                            resistenza.n_min_applicazioni_um ??
                                            ""
                                          }
                                          onChange={(e) => {
                                            const next = [...editedResistenze];
                                            next[idx] = {
                                              ...next[idx],
                                              n_min_applicazioni_um:
                                                e.target.value,
                                            };
                                            setEditedResistenze(next);
                                          }}
                                          readOnly={!canModify}
                                        />
                                      </div>
                                    </div>
                                    {canModify && (
                                      <div className="flex justify-end">
                                        <Button
                                          variant="ghost"
                                          className="text-red-600 hover:text-red-700"
                                          onClick={() => {
                                            setEditedResistenze((prev) =>
                                              prev.filter((_, i) => i !== idx)
                                            );
                                          }}
                                          disabled={isSaving}
                                        >
                                          Rimuovi
                                        </Button>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <div className="text-sm text-gray-600">
                          Nessuna resistenza presente.
                        </div>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={labelJson}
                    onChange={(e) => setLabelJson(e.target.value)}
                    className="font-mono min-h-[400px]"
                    readOnly={!canModify}
                  />
                  {canModify && (
                    <div className="flex justify-end">
                      <Button
                        onClick={async () => {
                          try {
                            const obj = JSON.parse(labelJson);
                            await saveAsync({ label: obj });
                          } catch {
                            toast.error("JSON non valido");
                          }
                        }}
                        disabled={isSaving}
                      >
                        {isSaving ? "Salvataggio…" : "Salva"}
                      </Button>
                    </div>
                  )}
                </div>
              )
            ) : null}

            {view === "dosaggi" ? (
              isFertilizer ? (
                // Fertilizer Dosages View
                viewMode === "table" ? (
                  <div className="space-y-4 pr-1">
                    {canModify && JSON.stringify(editedFertilizerDosages) !==
                      JSON.stringify(fertilizerDosages) && (
                      <div className="sticky top-0 z-10 flex flex-col sm:flex-row sm:justify-end gap-2 mb-4 pb-2 bg-background border-b sm:border-b-0">
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            setEditedFertilizerDosages(fertilizerDosages);
                          }}
                          disabled={isSaving}
                        >
                          Annulla
                        </Button>
                        <Button
                          className="w-full sm:w-auto"
                          onClick={async () => {
                            try {
                              const currentLabel =
                                detail.label as LabelWithFertilizer;
                              const fert =
                                currentLabel.prodotto_fertilizzante_ue || {};
                              const instr =
                                fert.istruzioni_uso_agronomiche || {};

                              const payloadLabel = {
                                ...currentLabel,
                                prodotto_fertilizzante_ue: {
                                  ...fert,
                                  istruzioni_uso_agronomiche: {
                                    ...instr,
                                    dosi_applicazione: {
                                      ...instr.dosi_applicazione,
                                      specifiche_coltura:
                                        editedFertilizerDosages,
                                    },
                                  },
                                },
                              };

                              await saveAsync({ label: payloadLabel });
                            } catch {
                              /* handled in mutation */
                            }
                          }}
                          disabled={isSaving}
                        >
                          {isSaving ? "Salvataggio…" : "Salva"}
                        </Button>
                      </div>
                    )}

                    {editedFertilizerDosages.length > 0 ? (
                      <Accordion type="multiple" className="space-y-2">
                        {editedFertilizerDosages.map((d, idx) => (
                          <AccordionItem
                            key={idx}
                            value={`dosaggio-${idx}`}
                            className="border rounded-lg px-3 md:px-4"
                          >
                            <AccordionTrigger className="hover:no-underline py-3">
                              <span className="text-left flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                                <span>
                                  <span className="font-semibold">
                                    #{idx + 1}
                                  </span>{" "}
                                  <span className="hidden sm:inline">-</span>{" "}
                                  <span className="block sm:inline truncate max-w-[200px] sm:max-w-none">
                                    {d.coltura || "Coltura non specificata"}
                                  </span>
                                </span>
                                <span className="text-muted-foreground text-xs sm:text-sm">
                                  <span className="hidden sm:inline"> - </span>
                                  {d.fase_fenologica ||
                                    "Fase non specificata"}{" "}
                                  <span className="text-black font-bold">
                                    (
                                    {d.dose_kg_ha != null
                                      ? `${d.dose_kg_ha} kg/ha`
                                      : d.dose_kg_ha_min != null ||
                                        d.dose_kg_ha_max != null
                                      ? `${d.dose_kg_ha_min ?? "-"}-${
                                          d.dose_kg_ha_max ?? "-"
                                        } kg/ha`
                                      : "-"}
                                    )
                                  </span>
                                </span>
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <Card className="shadow-none border-0">
                                <CardContent className="space-y-4 pt-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor={`coltura-${idx}`}>
                                        Coltura
                                      </Label>
                                      <Input
                                        id={`coltura-${idx}`}
                                        value={d.coltura ?? ""}
                                        onChange={(e) => {
                                          const newDosaggi = [
                                            ...editedFertilizerDosages,
                                          ];
                                          newDosaggi[idx] = {
                                            ...newDosaggi[idx],
                                            coltura: e.target.value,
                                          };
                                          setEditedFertilizerDosages(
                                            newDosaggi
                                          );
                                        }}
                                        readOnly={!canModify}
                                      />
                                    </div>
                                    {/* Show dose_kg_ha if available, otherwise show min/max */}
                                    {d.dose_kg_ha != null ? (
                                      <div className="space-y-2">
                                        <Label htmlFor={`dose-kg-ha-${idx}`}>
                                          Dose (kg/ha)
                                        </Label>
                                        <Input
                                          id={`dose-kg-ha-${idx}`}
                                          type="number"
                                          value={d.dose_kg_ha ?? ""}
                                          onChange={(e) => {
                                            const newDosaggi = [
                                              ...editedFertilizerDosages,
                                            ];
                                            newDosaggi[idx] = {
                                              ...newDosaggi[idx],
                                              dose_kg_ha: Number(
                                                e.target.value
                                              ),
                                            };
                                            setEditedFertilizerDosages(
                                              newDosaggi
                                            );
                                          }}
                                          readOnly={!canModify}
                                        />
                                      </div>
                                    ) : (
                                      <>
                                        <div className="space-y-2">
                                          <Label
                                            htmlFor={`dose-kg-ha-min-${idx}`}
                                          >
                                            Dose Min (kg/ha)
                                          </Label>
                                          <Input
                                            id={`dose-kg-ha-min-${idx}`}
                                            type="number"
                                            value={d.dose_kg_ha_min ?? ""}
                                            onChange={(e) => {
                                              const newDosaggi = [
                                                ...editedFertilizerDosages,
                                              ];
                                              newDosaggi[idx] = {
                                                ...newDosaggi[idx],
                                                dose_kg_ha_min: Number(
                                                  e.target.value
                                                ),
                                              };
                                              setEditedFertilizerDosages(
                                                newDosaggi
                                              );
                                            }}
                                            readOnly={!canModify}
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label
                                            htmlFor={`dose-kg-ha-max-${idx}`}
                                          >
                                            Dose Max (kg/ha)
                                          </Label>
                                          <Input
                                            id={`dose-kg-ha-max-${idx}`}
                                            type="number"
                                            value={d.dose_kg_ha_max ?? ""}
                                            onChange={(e) => {
                                              const newDosaggi = [
                                                ...editedFertilizerDosages,
                                              ];
                                              newDosaggi[idx] = {
                                                ...newDosaggi[idx],
                                                dose_kg_ha_max: Number(
                                                  e.target.value
                                                ),
                                              };
                                              setEditedFertilizerDosages(
                                                newDosaggi
                                              );
                                            }}
                                            readOnly={!canModify}
                                          />
                                        </div>
                                      </>
                                    )}
                                    <div className="space-y-2 md:col-span-2">
                                      <Label htmlFor={`fase-fenologica-${idx}`}>
                                        Fase Fenologica
                                      </Label>
                                      <Input
                                        id={`fase-fenologica-${idx}`}
                                        value={d.fase_fenologica ?? ""}
                                        onChange={(e) => {
                                          const newDosaggi = [
                                            ...editedFertilizerDosages,
                                          ];
                                          newDosaggi[idx] = {
                                            ...newDosaggi[idx],
                                            fase_fenologica: e.target.value,
                                          };
                                          setEditedFertilizerDosages(
                                            newDosaggi
                                          );
                                        }}
                                        readOnly={!canModify}
                                      />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <div className="text-sm text-gray-600">
                        Nessun dosaggio presente.
                      </div>
                    )}
                  </div>
                ) : (
                  // JSON View for Fertilizers
                  <div className="space-y-2">
                    <Textarea
                      value={labelJson}
                      onChange={(e) => setLabelJson(e.target.value)}
                      className="font-mono min-h-[400px]"
                      readOnly={!canModify}
                    />
                    {canModify && (
                      <div className="flex justify-end">
                        <Button
                          onClick={async () => {
                            try {
                              const obj = JSON.parse(labelJson);
                              await saveAsync({ label: obj });
                            } catch {
                              toast.error("JSON non valido");
                            }
                          }}
                          disabled={isSaving}
                        >
                          {isSaving ? "Salvataggio…" : "Salva"}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              ) : viewMode === "table" ? (
                <div className="space-y-4 pr-1">
                  {canModify && JSON.stringify(editedDosaggi) !==
                    JSON.stringify(detail.label?.dosaggi_dettagliati ?? []) && (
                    <div className="sticky top-0 z-10 flex flex-col sm:flex-row sm:justify-end gap-2 mb-4 pb-2 bg-background border-b sm:border-b-0">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setEditedDosaggi(
                            detail.label?.dosaggi_dettagliati ?? []
                          );
                        }}
                        disabled={isSaving}
                      >
                        Annulla
                      </Button>
                      <Button
                        className="w-full sm:w-auto"
                        onClick={async () => {
                          try {
                            await saveAsync({
                              label: {
                                ...detail.label,
                                dosaggi_dettagliati: editedDosaggi,
                              },
                            });
                          } catch {
                            /* handled in mutation */
                          }
                        }}
                        disabled={isSaving}
                      >
                        {isSaving ? "Salvataggio…" : "Salva"}
                      </Button>
                    </div>
                  )}

                  {editedDosaggi.length > 0 ? (
                    <Accordion type="multiple" className="space-y-2">
                      {editedDosaggi.map((d, idx) => (
                        <AccordionItem
                          key={idx}
                          value={`dosaggio-${idx}`}
                          className="border rounded-lg px-3 md:px-4"
                        >
                          <AccordionTrigger className="hover:no-underline py-3">
                            <span className="text-left flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                              <span>
                                <span className="font-semibold">
                                  #{idx + 1}
                                </span>{" "}
                                <span className="hidden sm:inline">-</span>{" "}
                                <span className="block sm:inline truncate max-w-[200px] sm:max-w-none">
                                  {d.coltura || "Coltura non specificata"}
                                </span>
                              </span>
                              <span className="text-muted-foreground text-xs sm:text-sm">
                                <span className="hidden sm:inline"> - </span>
                                {d.malattia || "Malattia non specificata"}{" "}
                                <span className="text-black font-bold">
                                  ({countFilledFields(d)})
                                </span>
                              </span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Card className="shadow-none border-0">
                              <CardContent className="space-y-4 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`coltura-${idx}`}>
                                      Coltura
                                    </Label>
                                    <Input
                                      id={`coltura-${idx}`}
                                      value={d.coltura ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          coltura: e.target.value,
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`malattia-${idx}`}>
                                      Malattia
                                    </Label>
                                    <Input
                                      id={`malattia-${idx}`}
                                      value={d.malattia ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          malattia: e.target.value,
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`dose-minima-${idx}`}>
                                      Dose minima
                                    </Label>
                                    <Input
                                      id={`dose-minima-${idx}`}
                                      type="number"
                                      value={d.dose_minima ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          dose_minima: Number(e.target.value),
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`dose-massima-${idx}`}>
                                      Dose massima
                                    </Label>
                                    <Input
                                      id={`dose-massima-${idx}`}
                                      type="number"
                                      value={d.dose_massima ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          dose_massima: Number(e.target.value),
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`dose-um-${idx}`}>
                                      Dose UM
                                    </Label>
                                    <Input
                                      id={`dose-um-${idx}`}
                                      value={d.dose_um ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          dose_um: e.target.value,
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`acqua-max-${idx}`}>
                                      Acqua max
                                    </Label>
                                    <Input
                                      id={`acqua-max-${idx}`}
                                      type="number"
                                      value={d.acqua_max ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          acqua_max: Number(e.target.value),
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`acqua-max-um-${idx}`}>
                                      Acqua max UM
                                    </Label>
                                    <Input
                                      id={`acqua-max-um-${idx}`}
                                      value={d.acqua_max_um ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          acqua_max_um: e.target.value,
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label
                                      htmlFor={`n-max-applicazioni-${idx}`}
                                    >
                                      # applicazioni
                                    </Label>
                                    <Input
                                      id={`n-max-applicazioni-${idx}`}
                                      type="number"
                                      value={d.n_max_applicazioni ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          n_max_applicazioni: Number(
                                            e.target.value
                                          ),
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label
                                      htmlFor={`n-max-applicazioni-um-${idx}`}
                                    >
                                      # applicazioni UM
                                    </Label>
                                    <Input
                                      id={`n-max-applicazioni-um-${idx}`}
                                      value={d.n_max_applicazioni_um ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          n_max_applicazioni_um: e.target.value,
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label
                                      htmlFor={`intervallo-min-giorni-${idx}`}
                                    >
                                      Intervallo min (gg)
                                    </Label>
                                    <Input
                                      id={`intervallo-min-giorni-${idx}`}
                                      type="number"
                                      value={d.intervallo_min_giorni ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          intervallo_min_giorni: Number(
                                            e.target.value
                                          ),
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label
                                      htmlFor={`intervallo-sicurezza-giorni-${idx}`}
                                    >
                                      Intervallo sicurezza (gg)
                                    </Label>
                                    <Input
                                      id={`intervallo-sicurezza-giorni-${idx}`}
                                      type="number"
                                      value={
                                        d.intervallo_sicurezza_giorni ?? ""
                                      }
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          intervallo_sicurezza_giorni: Number(
                                            e.target.value
                                          ),
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor={`epoca-impiego-${idx}`}>
                                      Epoca impiego
                                    </Label>
                                    <Input
                                      id={`epoca-impiego-${idx}`}
                                      value={d.epoca_impiego ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          epoca_impiego: e.target.value,
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2 md:col-span-2">
                                    <Label
                                      htmlFor={`modalita-applicazione-${idx}`}
                                    >
                                      Modalità applicazione
                                    </Label>
                                    <Input
                                      id={`modalita-applicazione-${idx}`}
                                      value={d.modalita_applicazione ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          modalita_applicazione: e.target.value,
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      readOnly={!canModify}
                                    />
                                  </div>
                                  <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor={`istruzioni-${idx}`}>
                                      Istruzioni
                                    </Label>
                                    <Textarea
                                      id={`istruzioni-${idx}`}
                                      value={d.istruzioni ?? ""}
                                      onChange={(e) => {
                                        const newDosaggi = [...editedDosaggi];
                                        newDosaggi[idx] = {
                                          ...newDosaggi[idx],
                                          istruzioni: e.target.value,
                                        };
                                        setEditedDosaggi(newDosaggi);
                                      }}
                                      className="min-h-[100px]"
                                      readOnly={!canModify}
                                    />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="text-sm text-gray-600">
                      Nessun dosaggio presente.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pr-1">
                  {(detail.label?.dosaggi_dettagliati ?? []).map((d, idx) => (
                    <div key={idx} className="space-y-2">
                      <Textarea
                        value={dosaggiJson[idx] ?? JSON.stringify(d, null, 2)}
                        onChange={(e) => {
                          setDosaggiJson((prev) => {
                            const next = [...prev];
                            next[idx] = e.target.value;
                            return next;
                          });
                        }}
                        className="font-mono min-h-[240px]"
                        readOnly={!canModify}
                      />
                      {canModify && (
                        <div className="flex justify-end">
                          <Button
                            onClick={async () => {
                              try {
                                const obj = JSON.parse(
                                  dosaggiJson[idx] ?? JSON.stringify(d)
                                );
                                const base = [
                                  ...(detail.label?.dosaggi_dettagliati ?? []),
                                ];
                                base[idx] = obj as LabelDosaggioDettagliato;
                                await saveAsync({
                                  label: {
                                    ...detail.label,
                                    dosaggi_dettagliati: base,
                                  },
                                });
                              } catch {
                                toast.error("JSON non valido");
                              }
                            }}
                            disabled={isSaving}
                          >
                            {isSaving ? "Salvataggio…" : "Salva"}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {detail.label?.dosaggi_dettagliati?.length ? null : (
                    <div className="text-sm text-gray-600">
                      Nessun dosaggio presente.
                    </div>
                  )}
                </div>
              )
            ) : null}
          </div>
          {/* Desktop PDF - hidden on mobile */}
          <div className="hidden md:block h-full min-h-0 overflow-y-auto">
            {String(detail.sourceUrl || "").length > 0 ? (
              <div className="w-full h-full border rounded-lg overflow-hidden">
                <iframe
                  title="Label PDF"
                  src={String(detail.sourceUrl)}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <Card className="p-6 shadow-none text-sm text-gray-600">
                PDF non disponibile.
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
