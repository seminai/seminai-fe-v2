import * as React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface PageHeaderProps {
  /**
   * Titolo della pagina
   */
  title: string;

  /**
   * Placeholder per il campo di ricerca
   */
  searchPlaceholder: string;

  /**
   * Valore corrente del campo di ricerca
   */
  searchValue: string;

  /**
   * Callback chiamata quando cambia il valore di ricerca
   */
  onSearchChange: (value: string) => void;

  /**
   * Numero totale di elementi (per mostrare il contatore)
   */
  totalItems: number;

  /**
   * Numero di elementi filtrati (per mostrare il contatore)
   */
  filteredItems: number;

  /**
   * Elemento da mostrare a destra (es. pulsante di import/aggiungi)
   */
  rightElement: React.ReactNode;
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
  rightElement,
}: PageHeaderProps): React.ReactElement {
  return (
    <div className="flex-shrink-0 p-6 mb-1 mt-1">
      <div className="flex justify-between items-center gap-4 mb-4">
        <h1 className="text-3xl text-agri-green-700 font-semibold whitespace-nowrap">
          {title}
        </h1>

        {/* Filtro di ricerca */}
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
          {searchValue && (
            <p className="text-xs text-gray-500 mt-1">
              {filteredItems} risultat
              {filteredItems === 1 ? "o" : "i"} su {totalItems}
            </p>
          )}
        </div>

        {rightElement}
      </div>
    </div>
  );
}
