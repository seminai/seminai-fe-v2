import { useMemo, type Dispatch, type ReactElement, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { machinesApiService, type Machine } from "@/api/machines";
import {
  userOnCompanyApiService,
  type UserOnCompany,
} from "@/api/userOnCompany";
import type {
  OperationMachineAssignment,
  OperationOperatorAssignment,
} from "@/api/dosage-agent";
import { Loader2, Wrench, User } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  MultiSearchableSelect,
  type MultiSearchableSelectOption,
} from "../MultiSearchableSelect";

interface OperatorsAndMachinesSectionProps {
  companies: Array<{ id: string; name: string }>;
  selectedCompanyIds: string[];
  operationMachines: OperationMachineAssignment[];
  setOperationMachines: Dispatch<SetStateAction<OperationMachineAssignment[]>>;
  operationOperators: OperationOperatorAssignment[];
  setOperationOperators: Dispatch<SetStateAction<OperationOperatorAssignment[]>>;
}

const SEPARATOR = "::";

function encodeCompositeKey(companyId: string, resourceId: string): string {
  return `${companyId}${SEPARATOR}${resourceId}`;
}

function decodeCompositeKey(value: string): { companyId: string; resourceId: string } | null {
  const idx = value.indexOf(SEPARATOR);
  if (idx === -1) return null;
  return {
    companyId: value.slice(0, idx),
    resourceId: value.slice(idx + SEPARATOR.length),
  };
}

export function OperatorsAndMachinesSection({
  companies,
  selectedCompanyIds,
  operationMachines,
  setOperationMachines,
  operationOperators,
  setOperationOperators,
}: OperatorsAndMachinesSectionProps): ReactElement {
  const selectedCompanies = companies.filter((c) =>
    selectedCompanyIds.includes(c.id),
  );

  const machinesQuery = useQuery({
    queryKey: ["dosage-machines-by-companies", selectedCompanyIds],
    queryFn: async () => {
      const map = new Map<string, Machine[]>();
      await Promise.all(
        selectedCompanyIds.map(async (companyId) => {
          try {
            const machines = await machinesApiService.listByCompany(companyId);
            map.set(companyId, machines);
          } catch {
            map.set(companyId, []);
          }
        }),
      );
      return map;
    },
    enabled: selectedCompanyIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const usersQuery = useQuery({
    queryKey: ["dosage-users-by-companies", selectedCompanyIds],
    queryFn: async () => {
      const map = new Map<string, UserOnCompany[]>();
      await Promise.all(
        selectedCompanyIds.map(async (companyId) => {
          try {
            const response =
              await userOnCompanyApiService.listByCompany(companyId);
            const users = response.data?.users ?? [];
            map.set(companyId, users);
          } catch {
            map.set(companyId, []);
          }
        }),
      );
      return map;
    },
    enabled: selectedCompanyIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const machinesByCompany = machinesQuery.data ?? new Map<string, Machine[]>();
  const usersByCompany = usersQuery.data ?? new Map<string, UserOnCompany[]>();

  const companyNameMap = useMemo(
    () => new Map(selectedCompanies.map((c) => [c.id, c.name])),
    [selectedCompanies],
  );

  const machineOptions = useMemo<MultiSearchableSelectOption[]>(() => {
    const options: MultiSearchableSelectOption[] = [];
    for (const [companyId, machines] of machinesByCompany) {
      const companyName = companyNameMap.get(companyId) ?? companyId;
      for (const m of machines) {
        options.push({
          value: encodeCompositeKey(companyId, m.id),
          label: m.name,
          description: m.identifier || undefined,
          groupLabel: companyName,
        });
      }
    }
    return options;
  }, [machinesByCompany, companyNameMap]);

  const operatorOptions = useMemo<MultiSearchableSelectOption[]>(() => {
    const options: MultiSearchableSelectOption[] = [];
    for (const [companyId, users] of usersByCompany) {
      const companyName = companyNameMap.get(companyId) ?? companyId;
      for (const u of users) {
        const fullName = u.user
          ? `${u.user.name} ${u.user.surname}`.trim() || u.user.email
          : u.userId;
        options.push({
          value: encodeCompositeKey(companyId, u.userId),
          label: fullName,
          description: u.user?.email,
          groupLabel: companyName,
        });
      }
    }
    return options;
  }, [usersByCompany, companyNameMap]);

  const selectedMachineValues = useMemo(
    () => operationMachines.map((m) => encodeCompositeKey(m.companyId, m.machineId)),
    [operationMachines],
  );

  const selectedOperatorValues = useMemo(
    () => operationOperators.map((o) => encodeCompositeKey(o.companyId, o.userId)),
    [operationOperators],
  );

  const handleMachinesChange = (values: string[]) => {
    const assignments: OperationMachineAssignment[] = [];
    for (const v of values) {
      const decoded = decodeCompositeKey(v);
      if (decoded) {
        assignments.push({ companyId: decoded.companyId, machineId: decoded.resourceId });
      }
    }
    setOperationMachines(assignments);
  };

  const handleOperatorsChange = (values: string[]) => {
    const assignments: OperationOperatorAssignment[] = [];
    for (const v of values) {
      const decoded = decodeCompositeKey(v);
      if (decoded) {
        assignments.push({ companyId: decoded.companyId, userId: decoded.resourceId });
      }
    }
    setOperationOperators(assignments);
  };

  if (selectedCompanies.length === 0) return <></>;

  const isLoading = machinesQuery.isLoading || usersQuery.isLoading;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-neutral-600" />
          Macchinari e operatori
        </h3>
        <p className="text-xs text-neutral-500 mt-1">
          Seleziona macchinari e operatori dalle aziende selezionate.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Caricamento operatori e macchinari...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-neutral-600 flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" />
              Macchinari
            </Label>
            <MultiSearchableSelect
              value={selectedMachineValues}
              options={machineOptions}
              placeholder="Seleziona macchinari..."
              searchPlaceholder="Cerca macchinario..."
              emptyMessage="Nessun macchinario disponibile"
              onChange={handleMachinesChange}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-neutral-600 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Operatori
            </Label>
            <MultiSearchableSelect
              value={selectedOperatorValues}
              options={operatorOptions}
              placeholder="Seleziona operatori..."
              searchPlaceholder="Cerca operatore..."
              emptyMessage="Nessun operatore disponibile"
              onChange={handleOperatorsChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
