import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAllFitosanitariRecords,
  type FitosanitariDatasetRecord,
} from "@/services/fitosanitariRegistry";
import type { MultiSearchableSelectOption } from "@/routes/DosageManager/MultiSearchableSelect";

export interface FitosanitarioMatch {
  index: number;
  strategy: "regnum" | "name";
}

interface MatchInput {
  name?: string | null;
  registrationNumber?: string | null;
}

interface UseFitosanitariMatchResult {
  records: FitosanitariDatasetRecord[];
  loading: boolean;
  options: MultiSearchableSelectOption[];
  findMatch: (row: MatchInput) => FitosanitarioMatch | null;
  getRecordByIndex: (indexStr: string) => FitosanitariDatasetRecord | null;
}

/**
 * Centralises loading the phytosanitary ministerial registry and matching
 * imported product rows against it. Prioritises match by `registrationNumber`
 * (deterministic, robust to manual name edits) and falls back to exact,
 * case-insensitive `productName` match.
 *
 * @param enabled If false, the registry is not fetched — caller-driven lazy load.
 */
export function useFitosanitariMatch(
  enabled: boolean,
): UseFitosanitariMatchResult {
  const [records, setRecords] = useState<FitosanitariDatasetRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    getAllFitosanitariRecords()
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch((err) => {
        if (active) console.error("Error loading fitosanitari registry:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  const findMatch = useCallback(
    (row: MatchInput): FitosanitarioMatch | null => {
      const reg = row.registrationNumber?.trim();
      if (reg) {
        const byReg = records.findIndex(
          (r) => r.registrationNumber?.trim() === reg,
        );
        if (byReg >= 0) return { index: byReg, strategy: "regnum" };
      }
      const name = row.name?.trim().toLowerCase();
      if (name) {
        const byName = records.findIndex(
          (r) => r.productName?.trim().toLowerCase() === name,
        );
        if (byName >= 0) return { index: byName, strategy: "name" };
      }
      return null;
    },
    [records],
  );

  const options = useMemo<MultiSearchableSelectOption[]>(() => {
    return records.map((p, index) => {
      const sostanzeAttive = (p.activeIngredients ?? "")
        .replace(/\|/g, " ")
        .trim();
      const statoAmministrativo = p.administrativeStatus?.trim() || "-";
      const principioAttivo = sostanzeAttive || "-";
      const numeroRegistrazione = p.registrationNumber?.trim() || "-";
      return {
        value: String(index),
        label: p.administrativeStatus
          ? `${p.productName} (${p.administrativeStatus})`
          : p.productName,
        groupLabel: "REGISTRO MINISTERIALE",
        description: `Stato: ${statoAmministrativo} • Principio attivo: ${principioAttivo} • N. registrazione: ${numeroRegistrazione}`,
        searchAliases: [p.registrationNumber ?? "", sostanzeAttive].filter(
          Boolean,
        ),
      };
    });
  }, [records]);

  const getRecordByIndex = useCallback(
    (indexStr: string): FitosanitariDatasetRecord | null => {
      const index = parseInt(indexStr, 10);
      if (Number.isNaN(index) || index < 0 || index >= records.length) {
        return null;
      }
      return records[index] ?? null;
    },
    [records],
  );

  return { records, loading, options, findMatch, getRecordByIndex };
}
