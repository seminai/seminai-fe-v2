import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { type LabelDetail, type LabelDosaggioDettagliato } from "@/api/labels";
import { useLabel } from "@/hooks/useLabel";
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

type LabelData = LabelDetail["label"];

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
    { id: "numero_registrazione", title: "N. registrazione", type: "text" },
    { id: "titolare", title: "Titolare", type: "text" },
    { id: "stabilimento", title: "Stabilimento", type: "text" },
    { id: "caratteristiche", title: "Caratteristiche", type: "text" },
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
    numero_registrazione: String(
      l.numero_registrazione ?? detail.registrationNumber ?? ""
    ),
    titolare: String(l.titolare ?? ""),
    stabilimento: String(l.stabilimento ?? ""),
    caratteristiche: String(l.caratteristiche ?? ""),
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

export default function LabelDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const [view, setView] = React.useState<"dati" | "dosaggi">("dati");
  const [viewMode, setViewMode] = React.useState<"table" | "json">("table");

  const {
    detail,
    isLoading,
    error,
    saveAsync,
    isSaving,
    verifyAsync,
    isVerifying,
  } = useLabel({ id });

  const [labelJson, setLabelJson] = React.useState<string>("{}");
  const [dosaggiJson, setDosaggiJson] = React.useState<string[]>([]);
  const [editedDosaggi, setEditedDosaggi] = React.useState<
    LabelDosaggioDettagliato[]
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
  }, [detail]);

  const columns = buildLabelColumns();

  return (
    <div className="p-6">
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/label">Etichette</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {detail?.productName ?? "Dettaglio"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">
            {detail
              ? `${detail.productName} - no. ${detail.registrationNumber}`
              : ""}
          </h1>
          {detail ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
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
              <label
                htmlFor="is-verified"
                className={`text-sm font-medium cursor-pointer ${
                  detail.isVerified ? "text-green-700" : "text-gray-600"
                }`}
              >
                {detail.isVerified ? "✓ Verificata" : "Non verificata"}
              </label>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "table" | "json")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Vista" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="table">Vista tabella</SelectItem>
              <SelectItem value="json">Vista JSON</SelectItem>
            </SelectContent>
          </Select>
          <div className="inline-flex p-1 bg-gray-100 rounded-lg gap-1">
            <button
              onClick={() => setView("dati")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === "dati"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Dettaggli
            </button>
            <button
              onClick={() => setView("dosaggi")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === "dosaggi"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Dosaggi
            </button>
          </div>
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
        <div className="grid md:grid-cols-2 gap-4 md:h-[calc(100svh-12rem)]">
          <div className="md:h-full md:overflow-auto">
            {view === "dati" ? (
              viewMode === "table" ? (
                <EditableTable
                  columns={columns}
                  rows={[toLabelRow(detail)]}
                  isModify={true}
                  isVertical={true}
                  alwaysEdit={true}
                  getRowId={() => "row-0"}
                  onSave={async ({ updated }) => {
                    try {
                      const row = updated?.[0] ?? {};
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
                      };
                      await saveAsync({ label: payloadLabel });
                    } catch {
                      /* handled in mutation */
                    }
                  }}
                  className="bg-background"
                />
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={labelJson}
                    onChange={(e) => setLabelJson(e.target.value)}
                    className="font-mono min-h-[400px]"
                  />
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
                </div>
              )
            ) : null}

            {view === "dosaggi" ? (
              viewMode === "table" ? (
                <div className="space-y-4 pr-1">
                  {JSON.stringify(editedDosaggi) !==
                    JSON.stringify(detail.label?.dosaggi_dettagliati ?? []) && (
                    <div className="flex justify-end gap-2 mb-4">
                      <Button
                        variant="outline"
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
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <span className="text-left">
                              <span className="font-semibold">#{idx + 1}</span>{" "}
                              - {d.coltura || "Coltura non specificata"} -{" "}
                              {d.malattia || "Malattia non specificata"} -{" "}
                              <span className="text-muted-foreground text-sm text-agri-green-700 font-bold">
                                {countFilledFields(d)}
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
                      />
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
          <div className="md:h-full md:overflow-auto">
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
