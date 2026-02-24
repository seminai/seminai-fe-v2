import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, PenLine, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/organism/Header";

export default function NewJobChoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { jobId?: string } | null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Nuova operazione"
        className="border-b border-border/50"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/job")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Button>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-2xl mx-auto w-full space-y-4 mt-8">
          <h2 className="text-lg font-semibold text-foreground text-center mb-6">
            Come vuoi creare l'operazione?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Creazione manuale */}
            <button
              type="button"
              onClick={() =>
                navigate("/job/new-job-manual", {
                  state: locationState,
                })
              }
              className="group flex flex-col items-center gap-4 rounded-2xl border border-border bg-white p-8 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md cursor-pointer"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-neutral-200">
                <PenLine className="h-7 w-7" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-base font-semibold text-foreground">
                  Creazione manuale
                </p>
                <p className="text-sm text-muted-foreground">
                  Inserisci i dati dell'operazione manualmente
                </p>
              </div>
            </button>

            {/* Importa automaticamente */}
            <button
              type="button"
              onClick={() => navigate("/dosage-manager")}
              className="group flex flex-col items-center gap-4 rounded-2xl border border-border bg-white p-8 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md cursor-pointer"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-neutral-200">
                <Wand2 className="h-7 w-7" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-base font-semibold text-foreground">
                  Importa automaticamente
                </p>
                <p className="text-sm text-muted-foreground">
                  Genera dosaggi e operazioni in automatico
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
