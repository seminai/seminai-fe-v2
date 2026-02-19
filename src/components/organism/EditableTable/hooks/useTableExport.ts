import { useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { EditableColumn, InternalRow, CustomExportConfig } from "../types";
import { toDateObject, formatExportValue, generateExportFileName } from "../utils";

export interface UseTableExportReturn {
  handleExportCsv: () => void;
  handleExportExcel: () => void;
}

export function useTableExport(
  columns: EditableColumn[],
  filteredRows: InternalRow[],
  exportFileName?: string,
  customExportConfig?: CustomExportConfig
): UseTableExportReturn {
  const appendExportDateColumn = useCallback(
    (headers: string[], data: Array<Array<unknown>>) => {
      const exportDate = format(new Date(), "dd/MM/yyyy", { locale: it });
      return {
        headers: [...headers, "Data"],
        data: data.map((row) => [...row, exportDate]),
      };
    },
    []
  );

  const downloadCsv = useCallback(
    (content: string) => {
      const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", generateExportFileName(exportFileName, "csv"));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [exportFileName]
  );

  const handleExportCsv = useCallback(() => {
    if (customExportConfig && customExportConfig.columns.length > 0) {
      const baseHeaders = customExportConfig.columns.map((col) => col.header);
      const data = filteredRows.map((row) =>
        customExportConfig.columns.map((col) => formatExportValue(col.accessor(row.data)))
      );
      const { headers, data: dataWithDate } = appendExportDateColumn(baseHeaders, data);

      const csvContent = Papa.unparse({ fields: headers, data: dataWithDate });
      downloadCsv(csvContent);
      return;
    }

    const quantityColumnIndex = columns.findIndex((col) => col.id === "quantity");
    const umColumnIndex = columns.findIndex(
      (col) =>
        col.id === "quantityUnitOfMeasure" ||
        col.id === "unitOfMeasureQuantity" ||
        col.id === "unitOfMeasure"
    );

    const hasUmInData =
      filteredRows.length > 0 &&
      (filteredRows[0].data.unitOfMeasureQuantity !== undefined ||
        filteredRows[0].data.quantityUnitOfMeasure !== undefined);

    const baseHeaders = columns
      .map((column, index) => {
        if (index === umColumnIndex && quantityColumnIndex !== -1) {
          return null;
        }
        return column.title || column.id;
      })
      .filter((header): header is string => header !== null);

    const data = filteredRows.map((row) => {
      return columns
        .map((column, index) => {
          if (index === umColumnIndex && quantityColumnIndex !== -1) {
            return null;
          }

          const value = row.data[column.id];

          if (index === quantityColumnIndex) {
            const quantityValue = value;
            let umValue: unknown = undefined;
            if (umColumnIndex !== -1) {
              umValue = row.data[columns[umColumnIndex].id];
            } else if (hasUmInData) {
              umValue =
                row.data.unitOfMeasureQuantity ??
                row.data.quantityUnitOfMeasure ??
                row.data.unitOfMeasure;
            }

            if (quantityValue === undefined || quantityValue === null) {
              return "";
            }

            const quantityStr = String(quantityValue);
            const umStr = umValue ? String(umValue).trim() : "";
            return umStr ? `${quantityStr} ${umStr}` : quantityStr;
          }

          if (value === undefined || value === null) {
            return "";
          }

          if (column.type === "date") {
            const dateValue = toDateObject(value);
            if (dateValue) {
              return format(dateValue, "dd/MM/yyyy", { locale: it });
            }
            return "";
          }

          return String(value);
        })
        .filter((cell): cell is string => cell !== null);
    });

    const { headers, data: dataWithDate } = appendExportDateColumn(baseHeaders, data);
    const csvContent = Papa.unparse({ fields: headers, data: dataWithDate });
    downloadCsv(csvContent);
  }, [columns, filteredRows, customExportConfig, appendExportDateColumn, downloadCsv]);

  const handleExportExcel = useCallback(() => {
    let baseHeaders: string[];
    let data: Array<Array<unknown>>;

    if (customExportConfig && customExportConfig.columns.length > 0) {
      baseHeaders = customExportConfig.columns.map((col) => col.header);
      data = filteredRows.map((row) =>
        customExportConfig.columns.map((col) => formatExportValue(col.accessor(row.data)))
      );
    } else {
      const quantityColumnIndex = columns.findIndex((col) => col.id === "quantity");
      const umColumnIndex = columns.findIndex(
        (col) =>
          col.id === "quantityUnitOfMeasure" ||
          col.id === "unitOfMeasureQuantity" ||
          col.id === "unitOfMeasure"
      );

      const hasUmInData =
        filteredRows.length > 0 &&
        (filteredRows[0].data.unitOfMeasureQuantity !== undefined ||
          filteredRows[0].data.quantityUnitOfMeasure !== undefined);

      baseHeaders = columns
        .map((column, index) => {
          if (index === umColumnIndex && quantityColumnIndex !== -1) {
            return null;
          }
          return column.title || column.id;
        })
        .filter((header): header is string => header !== null);

      data = filteredRows.map((row) => {
        return columns
          .map((column, index) => {
            if (index === umColumnIndex && quantityColumnIndex !== -1) {
              return null;
            }

            const value = row.data[column.id];

            if (index === quantityColumnIndex) {
              const quantityValue = value;
              let umValue: unknown = undefined;
              if (umColumnIndex !== -1) {
                umValue = row.data[columns[umColumnIndex].id];
              } else if (hasUmInData) {
                umValue =
                  row.data.unitOfMeasureQuantity ??
                  row.data.quantityUnitOfMeasure ??
                  row.data.unitOfMeasure;
              }

              if (quantityValue === undefined || quantityValue === null) {
                return "";
              }

              const quantityStr = String(quantityValue);
              const umStr = umValue ? String(umValue).trim() : "";
              return umStr ? `${quantityStr} ${umStr}` : quantityStr;
            }

            if (value === undefined || value === null) {
              return "";
            }

            if (column.type === "date") {
              const dateValue = toDateObject(value);
              if (dateValue) {
                return format(dateValue, "dd/MM/yyyy", { locale: it });
              }
              return "";
            }

            return String(value);
          })
          .filter((cell): cell is string => cell !== null);
      });
    }

    const { headers, data: dataWithDate } = appendExportDateColumn(baseHeaders, data);
    const worksheetData = [headers, ...dataWithDate];
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    const columnWidths = headers.map((header, colIndex) => {
      const maxLength = Math.max(
        header.length,
        ...dataWithDate.map((row) => String(row[colIndex] || "").length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Dati");
    const filename = generateExportFileName(exportFileName, "xlsx");
    XLSX.writeFile(workbook, filename);
  }, [columns, filteredRows, customExportConfig, appendExportDateColumn, exportFileName]);

  return {
    handleExportCsv,
    handleExportExcel,
  };
}
