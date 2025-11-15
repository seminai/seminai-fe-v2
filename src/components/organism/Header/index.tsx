import * as React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /**
   * Titolo della pagina
   */
  title: string;

  /**
   * Placeholder per il campo di ricerca
   */
  searchPlaceholder?: string;

  /**
   * Valore corrente del campo di ricerca
   */
  searchValue?: string;

  /**
   * Callback chiamata quando cambia il valore di ricerca
   */
  onSearchChange?: (value: string) => void;

  /**
   * Numero totale di elementi (per mostrare il contatore)
   */
  totalItems?: number;

  /**
   * Numero di elementi filtrati (per mostrare il contatore)
   */
  filteredItems?: number;

  /**
   * Elemento da mostrare al centro (es. toggle per cambiare vista)
   */
  centerElement?: React.ReactNode;

  /**
   * Elemento da mostrare a destra (es. pulsante di import/aggiungi)
   */
  rightElement?: React.ReactNode;

  /**
   * Elementi di filtro (es. dropdown per azienda) - su mobile vanno sempre nella riga sotto
   */
  filterElement?: React.ReactNode;

  /**
   * Classe CSS per il componente
   */
  className?: string;
}

/**
 * Componente Header riutilizzabile per le pagine di lista
 * Mostra titolo, barra di ricerca centrale e azione a destra
 */
export function PageHeader({
  title,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  totalItems,
  filteredItems,
  centerElement,
  rightElement,
  filterElement,
  className,
}: PageHeaderProps): React.ReactElement {
  const canShowResults =
    Boolean(searchValue) &&
    totalItems !== undefined &&
    filteredItems !== undefined;
  const resultsLabel = canShowResults
    ? `${filteredItems} risultat${
        filteredItems === 1 ? "o" : "i"
      } su ${totalItems}`
    : "\u00A0";

  return (
    <div className={cn(className, "flex-shrink-0 p-6 mb-1 mt-1")}>
      {/* Layout desktop - tutto in una riga */}
      <div className="hidden md:flex justify-between items-center gap-4 mb-4">
        <h1 className="text-3xl text-agri-green-700 font-semibold whitespace-nowrap">
          {title}
        </h1>

        {/* Elemento centrale (toggle o ricerca) */}
        {centerElement ? (
          <div className="flex-1 flex justify-center">{centerElement}</div>
        ) : searchPlaceholder && searchValue !== undefined && onSearchChange ? (
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 min-h-[18px] leading-none transition-opacity duration-150">
              {resultsLabel}
            </p>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex items-center gap-3">
          {filterElement && <div>{filterElement}</div>}
          {rightElement && <div>{rightElement}</div>}
        </div>
      </div>

      {/* Layout mobile - elementi su righe separate */}
      <div className="flex md:hidden flex-col gap-3 mb-4">
        <div className="flex justify-between items-start gap-3">
          <h1 className="text-2xl text-agri-green-700 font-semibold flex-shrink-0">
            {title}
          </h1>
        </div>

        {/* Bottoni d'azione - sempre sulla seconda riga su mobile per avere più spazio */}
        {rightElement && <div className="w-full">{rightElement}</div>}

        {/* Filtri - sulla terza riga su mobile */}
        {filterElement && (
          <div className="w-full flex items-center gap-2">{filterElement}</div>
        )}

        {/* Elemento centrale (toggle o ricerca) - a tutta larghezza su mobile */}
        {centerElement ? (
          <div className="w-full flex justify-center">{centerElement}</div>
        ) : searchPlaceholder && searchValue !== undefined && onSearchChange ? (
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 min-h-[18px] leading-none transition-opacity duration-150">
              {resultsLabel}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
