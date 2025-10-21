import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  labelsApiService,
  type LabelDetail,
  type LabelDosaggioDettagliato,
} from "@/api/labels";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { EditableTable, type EditableColumn } from "@/components/ui/table";
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
import authService from "@/utils/auth";
import { productsApiService } from "@/api/products";
import { toast } from "sonner";
import { toList, parseList, buildColumns } from "@/utils/tableHelpers";

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

const buildDosaggioColumns = (): EditableColumn[] =>
  buildColumns<LabelDosaggioDettagliato>([
    { id: "coltura", title: "Coltura", type: "text" },
    { id: "malattia", title: "Malattia", type: "text" },
    { id: "dose", title: "Dose", type: "number" },
    { id: "dose_um", title: "Dose UM", type: "text" },
    { id: "acqua_max", title: "Acqua max", type: "number" },
    { id: "acqua_max_um", title: "Acqua max UM", type: "text" },
    { id: "n_max_applicazioni", title: "# applicazioni", type: "number" },
    { id: "n_max_applicazioni_um", title: "# applicazioni UM", type: "text" },
    {
      id: "intervallo_min_giorni",
      title: "Intervallo min (gg)",
      type: "number",
    },
    {
      id: "intervallo_sicurezza_giorni",
      title: "Intervallo sicurezza (gg)",
      type: "number",
    },
    { id: "epoca_impiego", title: "Epoca impiego", type: "text" },
    {
      id: "modalita_applicazione",
      title: "Modalità applicazione",
      type: "text",
    },
    { id: "istruzioni", title: "Istruzioni", type: "text" },
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

const toDosaggioRow = (
  d: LabelDosaggioDettagliato
): Record<string, unknown> => ({
  coltura: String(d.coltura ?? ""),
  malattia: String(d.malattia ?? ""),
  dose: typeof d.dose === "number" ? d.dose : Number(d.dose ?? 0),
  dose_um: String(d.dose_um ?? ""),
  acqua_max:
    typeof d.acqua_max === "number" ? d.acqua_max : Number(d.acqua_max ?? 0),
  acqua_max_um: String(d.acqua_max_um ?? ""),
  n_max_applicazioni:
    typeof d.n_max_applicazioni === "number"
      ? d.n_max_applicazioni
      : Number(d.n_max_applicazioni ?? 0),
  n_max_applicazioni_um: String(d.n_max_applicazioni_um ?? ""),
  intervallo_min_giorni:
    typeof d.intervallo_min_giorni === "number"
      ? d.intervallo_min_giorni
      : Number(d.intervallo_min_giorni ?? 0),
  intervallo_sicurezza_giorni:
    typeof d.intervallo_sicurezza_giorni === "number"
      ? d.intervallo_sicurezza_giorni
      : Number(d.intervallo_sicurezza_giorni ?? 0),
  epoca_impiego: String(d.epoca_impiego ?? ""),
  modalita_applicazione: String(d.modalita_applicazione ?? ""),
  istruzioni: String(d.istruzioni ?? ""),
});

export default function LabelDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const [view, setView] = React.useState<"dati" | "dosaggi">("dati");
  const [viewMode, setViewMode] = React.useState<"table" | "json">("table");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["labels", "detail", id],
    queryFn: async () => labelsApiService.getById(id),
    enabled: Boolean(id),
  });

  const detail: LabelDetail | undefined = data?.data;

  const { mutateAsync: saveAsync, isPending: isSaving } = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const token = authService.getAuthToken();
      if (!token) throw new Error("Unauthorized");
      return await productsApiService.updateWithBearer(token, id, payload);
    },
    onSuccess: async () => {
      toast.success("Dati salvati");
      await queryClient.invalidateQueries({
        queryKey: ["labels", "detail", id],
      });
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Salvataggio fallito";
      toast.error(message);
    },
  });

  const [labelJson, setLabelJson] = React.useState<string>("{}");
  const [dosaggiJson, setDosaggiJson] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!detail) return;
    setLabelJson(JSON.stringify(detail.label ?? {}, null, 2));
    setDosaggiJson(
      (detail.label?.dosaggi_dettagliati ?? []).map((d) =>
        JSON.stringify(d, null, 2)
      )
    );
  }, [detail]);

  const columns = buildLabelColumns();
  const dosaggioColumns = buildDosaggioColumns();

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
        <h1 className="text-2xl font-semibold">
          {detail
            ? `${detail.productName} - no. ${detail.registrationNumber}`
            : ""}
        </h1>
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
          <Button
            variant={view === "dati" ? "default" : "outline"}
            onClick={() => setView("dati")}
          >
            Dati etichetta
          </Button>
          <Button
            variant={view === "dosaggi" ? "default" : "outline"}
            onClick={() => setView("dosaggi")}
          >
            Dosaggi dettagliati
          </Button>
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
          <div className="space-y-4 md:overflow-auto">
            <Card className="p-4 shadow-none">
              {view === "dati" ? (
                viewMode === "table" ? (
                  <EditableTable
                    columns={columns}
                    rows={[toLabelRow(detail)]}
                    isModify={true}
                    isVertical={true}
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
                  <div className="space-y-4 md:max-h-[calc(100svh-18rem)] md:overflow-auto pr-1">
                    {(detail.label?.dosaggi_dettagliati ?? []).map((d, idx) => (
                      <EditableTable
                        key={idx}
                        columns={dosaggioColumns}
                        rows={[toDosaggioRow(d as LabelDosaggioDettagliato)]}
                        isModify={true}
                        isVertical={true}
                        getRowId={() => `dos-${idx}`}
                        onSave={async ({ updated }) => {
                          try {
                            const row = updated?.[0] ?? {};
                            const updatedDosaggio: LabelDosaggioDettagliato = {
                              coltura: String(row.coltura ?? d.coltura ?? ""),
                              malattia: String(
                                row.malattia ?? d.malattia ?? ""
                              ),
                              dose:
                                typeof row.dose === "number"
                                  ? row.dose
                                  : Number(row.dose ?? d.dose ?? 0),
                              dose_um: String(row.dose_um ?? d.dose_um ?? ""),
                              acqua_max:
                                typeof row.acqua_max === "number"
                                  ? row.acqua_max
                                  : Number(row.acqua_max ?? d.acqua_max ?? 0),
                              acqua_max_um: String(
                                row.acqua_max_um ?? d.acqua_max_um ?? ""
                              ),
                              n_max_applicazioni:
                                typeof row.n_max_applicazioni === "number"
                                  ? row.n_max_applicazioni
                                  : Number(
                                      row.n_max_applicazioni ??
                                        d.n_max_applicazioni ??
                                        0
                                    ),
                              n_max_applicazioni_um: String(
                                row.n_max_applicazioni_um ??
                                  d.n_max_applicazioni_um ??
                                  ""
                              ),
                              intervallo_min_giorni:
                                typeof row.intervallo_min_giorni === "number"
                                  ? row.intervallo_min_giorni
                                  : Number(
                                      row.intervallo_min_giorni ??
                                        d.intervallo_min_giorni ??
                                        0
                                    ),
                              intervallo_sicurezza_giorni:
                                typeof row.intervallo_sicurezza_giorni ===
                                "number"
                                  ? row.intervallo_sicurezza_giorni
                                  : Number(
                                      row.intervallo_sicurezza_giorni ??
                                        d.intervallo_sicurezza_giorni ??
                                        0
                                    ),
                              epoca_impiego: String(
                                row.epoca_impiego ?? d.epoca_impiego ?? ""
                              ),
                              modalita_applicazione: String(
                                row.modalita_applicazione ??
                                  d.modalita_applicazione ??
                                  ""
                              ),
                              istruzioni: String(
                                row.istruzioni ?? d.istruzioni ?? ""
                              ),
                            };

                            const base = [
                              ...(detail.label?.dosaggi_dettagliati ?? []),
                            ];
                            base[idx] = updatedDosaggio;
                            await saveAsync({
                              label: {
                                ...detail.label,
                                dosaggi_dettagliati: base,
                              },
                            });
                          } catch {
                            /* handled in mutation */
                          }
                        }}
                        className="bg-background"
                      />
                    ))}
                    {detail.label?.dosaggi_dettagliati?.length ? null : (
                      <div className="text-sm text-gray-600">
                        Nessun dosaggio presente.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 md:max-h-[calc(100svh-18rem)] md:overflow-auto pr-1">
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
            </Card>
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
