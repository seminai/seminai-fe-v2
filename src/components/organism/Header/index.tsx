import * as React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /**
   * Titolo della pagina
   */
  title: React.ReactNode;

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
   * Elementi mostrati accanto al titolo principale
   */
  children?: React.ReactNode;
  /**
   * Elementi di filtro (es. dropdown per azienda) - su mobile vanno sempre nella riga sotto
   */
  filterElement?: React.ReactNode;

  /**
   * Classe CSS per il componente
   */
  className?: string;

  /**
   * Stile inline per il componente
   */
  style?: React.CSSProperties;
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
  style,
  children,
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

  const renderSearchArea = (): React.ReactNode => {
    if (searchPlaceholder && searchValue !== undefined && onSearchChange) {
      return (
        <div className="w-full max-w-xl">
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
          <p className="text-xs text-gray-500 mt-1 min-h-[18px] leading-none transition-opacity duration-150 text-right">
            {resultsLabel}
          </p>
        </div>
      );
    }

    return null;
  };

  const searchContent = renderSearchArea();

  return (
    <div className={cn(className, "flex-shrink-0 p-6 mb-1 mt-1")} style={style}>
      {/* Layout desktop/tablet */}
      <div className="hidden md:flex flex-col gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <h1 className="text-3xl text-black font-semibold whitespace-nowrap">
              {title}
            </h1>
            {children && (
              <div className="ml-auto flex items-center gap-2">{children}</div>
            )}
          </div>
          {searchContent && (
            <div className="flex-1 min-w-[280px] flex justify-end ml-auto">
              {searchContent}
            </div>
          )}
        </div>

        {centerElement && (
          <div className="w-full flex justify-center px-4">
            <div className="w-full max-w-3xl">{centerElement}</div>
          </div>
        )}

        {(filterElement || rightElement) && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {filterElement && (
              <div className="min-w-[200px] flex-1 sm:flex-none">
                {filterElement}
              </div>
            )}
            {rightElement && (
              <div className="flex items-center justify-end gap-3">
                {rightElement}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Layout mobile - elementi su righe separate */}
      <div className="flex md:hidden flex-col gap-3 mb-4">
        <div className="flex justify-between items-start gap-3">
          {/* Titolo nascosto su mobile perché mostrato nell'header mobile */}
          {children && (
            <div className="flex items-center gap-2">{children}</div>
          )}
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
