import * as React from "react";
import {
  IoLayersOutline,
  IoStorefrontOutline,
  IoArrowForward,
} from "react-icons/io5";
import { cn } from "@/lib/utils";
import type { QuickCreatePath } from "../types";

interface PathCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}

function PathCard({
  icon,
  title,
  description,
  badge,
  onClick,
}: PathCardProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start gap-4 w-full max-w-sm p-6 rounded-2xl border-2",
        "border-neutral-200 bg-white text-left",
        "transition-all duration-200 cursor-pointer",
        "hover:border-agri-green-500 hover:shadow-md hover:bg-agri-green-50/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agri-green-500",
      )}
    >
      {badge && (
        <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 rounded-full bg-agri-green-100 text-agri-green-700">
          {badge}
        </span>
      )}

      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-agri-green-100 text-agri-green-700 group-hover:bg-agri-green-200 transition-colors">
        {icon}
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-semibold text-neutral-800 mb-1">{title}</h3>
        <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
      </div>

      <div className="flex items-center gap-1 text-sm font-medium text-agri-green-600 mt-1 group-hover:gap-2 transition-all">
        Seleziona
        <IoArrowForward className="w-4 h-4" />
      </div>
    </button>
  );
}

interface ChoosePathStepProps {
  onChoosePath: (path: QuickCreatePath) => void;
}

export default function ChoosePathStep({
  onChoosePath,
}: ChoosePathStepProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <h2 className="text-2xl font-semibold text-neutral-800 mb-2">
        Come vuoi procedere?
      </h2>
      <p className="text-neutral-500 mb-10 text-center max-w-lg">
        Scegli se configurare campi e unità produttive oppure andare
        direttamente a gestire il magazzino.
      </p>

      <div className="flex flex-col sm:flex-row items-stretch gap-5 w-full max-w-2xl">
        <PathCard
          icon={<IoLayersOutline className="w-6 h-6" />}
          title="Campi e Magazzino"
          description="Importa i tuoi campi agricoli, configura le unità produttive e poi aggiungi i prodotti a magazzino."
          badge="Consigliato"
          onClick={() => onChoosePath("full")}
        />
        <PathCard
          icon={<IoStorefrontOutline className="w-6 h-6" />}
          title="Solo Magazzino"
          description="Salta la configurazione dei campi e vai direttamente a caricare i prodotti nel tuo magazzino."
          onClick={() => onChoosePath("warehouse")}
        />
      </div>
    </div>
  );
}
