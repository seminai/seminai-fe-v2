import { useState, useCallback } from "react";
import { EditableColumn, InternalRow } from "../types";

export interface UseTableSortReturn {
  sortColumn: string | undefined;
  sortDirection: "asc" | "desc";
  sortRows: (rows: InternalRow[], columns: EditableColumn[]) => InternalRow[];
  handleSort: (columnId: string, direction?: "asc" | "desc") => void;
  resetSort: () => void;
}

export function useTableSort(): UseTableSortReturn {
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortRows = useCallback(
    (rows: InternalRow[], columns: EditableColumn[]): InternalRow[] => {
      if (!sortColumn) {
        return rows;
      }

      const column = columns.find((c) => c.id === sortColumn);

      return [...rows].sort((a, b) => {
        const aVal = a.data[sortColumn];
        const bVal = b.data[sortColumn];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        let comparison = 0;

        switch (column?.type) {
          case "number":
          case "currency":
            comparison = Number(aVal) - Number(bVal);
            break;
          case "date": {
            const dateA = new Date(String(aVal)).getTime();
            const dateB = new Date(String(bVal)).getTime();
            comparison = dateA - dateB;
            break;
          }
          case "text":
          default:
            if (typeof aVal === "boolean" && typeof bVal === "boolean") {
              comparison = aVal === bVal ? 0 : aVal ? 1 : -1;
            } else {
              comparison = String(aVal).localeCompare(String(bVal));
            }
            break;
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    },
    [sortColumn, sortDirection]
  );

  const handleSort = useCallback(
    (columnId: string, direction?: "asc" | "desc") => {
      setSortColumn((prevColumn) => {
        const isSameColumn = prevColumn === columnId;
        const newDirection: "asc" | "desc" =
          direction ??
          (isSameColumn
            ? sortDirection === "asc"
              ? "desc"
              : "asc"
            : "asc");
        setSortDirection(newDirection);
        return columnId;
      });
    },
    [sortDirection]
  );

  const resetSort = useCallback(() => {
    setSortColumn(undefined);
    setSortDirection("asc");
  }, []);

  return {
    sortColumn,
    sortDirection,
    sortRows,
    handleSort,
    resetSort,
  };
}
