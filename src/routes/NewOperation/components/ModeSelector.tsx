import type { ReactElement } from "react";
import { PenLine, Sparkles } from "lucide-react";
import type { OperationMode } from "../types";

interface ModeSelectorProps {
  onModeChange: (mode: OperationMode) => void;
}

export function ModeSelector({
  onModeChange,
}: ModeSelectorProps): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-900">
            Modalità di creazione
          </h2>
          <p className="text-sm text-neutral-500">
            Scegli come inserire i dati dell'operazione
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onModeChange("manual")}
            className="group rounded-2xl border-2 border-neutral-200 bg-white p-6 text-left transition-all hover:border-neutral-400 hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200">
                <PenLine className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900">
                Manuale
              </h3>
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Inserisci manualmente i prodotti, le dosi e le date di
              applicazione per ogni unità produttiva.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onModeChange("automatic")}
            className="group rounded-2xl border-2 border-neutral-200 bg-white p-6 text-left transition-all hover:border-blue-400 hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900">
                Automatico
              </h3>
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Importa i prodotti e lascia all'AI il calcolo dei dosaggi
              ottimali per le tue unità produttive.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
