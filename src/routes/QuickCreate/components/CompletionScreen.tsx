import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import LeafConfetti from "./LeafConfetti";

interface CompletionScreenProps {
  onGoToDosage: () => void;
  onGoToDashboard: () => void;
}

export default function CompletionScreen({
  onGoToDosage,
  onGoToDashboard,
}: CompletionScreenProps) {
  return (
    <>
      <LeafConfetti />
      <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh]">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-agri-green-100 mb-6">
          <CheckCircle className="w-10 h-10 text-agri-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-neutral-800 mb-3">
          Operazione completata!
        </h2>
        <p className="text-neutral-500 mb-8 text-center max-w-md">
          Azienda, campi e unità produttive sono stati creati con successo. Ora
          puoi procedere alla generazione dei dosaggi.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={onGoToDosage}
            className="gap-2 px-8"
          >
            Vai a genera dosaggi
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onGoToDashboard}
            className="text-neutral-500"
          >
            Torna alla dashboard
          </Button>
        </div>
      </div>
    </>
  );
}
