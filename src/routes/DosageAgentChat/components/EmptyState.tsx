import { Bot } from "lucide-react";

const SUGGESTIONS = [
  "Il Captano a 1.5 kg/ha su melo e conforme?",
  "Quali prodotti posso usare per la peronospora della vite?",
  "Verifica se Prolectus 50 WG e stato revocato",
  "Pianifica i trattamenti per melo su 2 ettari",
];

export function EmptyState({
  onSuggestionClick,
}: {
  onSuggestionClick: (text: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-emerald-50 rounded-full p-4 mb-4">
        <Bot className="h-8 w-8 text-emerald-600" />
      </div>
      <p className="text-base font-medium text-slate-700">Chat</p>
      <p className="text-sm text-slate-500 max-w-sm mt-2">
        Chiedi informazioni su dosaggi, conformita ai disciplinari,
        compatibilita tra prodotti fitosanitari e molto altro.
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:border-emerald-300 cursor-pointer text-left transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
