import { useState, type Dispatch, type ReactElement, type SetStateAction } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Loader2, Wrench, User } from "lucide-react";
import { useMachines } from "@/hooks/useMachines";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { toast } from "sonner";

interface OperatorsAndMachinesSectionProps {
  companies: Array<{ id: string; name: string }>;
  selectedCompanyIds: string[];
  operationMachines: OperationMachineAssignment[];
  setOperationMachines: Dispatch<SetStateAction<OperationMachineAssignment[]>>;
  operationOperators: OperationOperatorAssignment[];
  setOperationOperators: Dispatch<SetStateAction<OperationOperatorAssignment[]>>;
}

type CreateDialogType = "machine" | "operator";

export function OperatorsAndMachinesSection({
  companies,
  selectedCompanyIds,
  operationMachines,
  setOperationMachines,
  operationOperators,
  setOperationOperators,
}: OperatorsAndMachinesSectionProps): ReactElement {
  const [createDialog, setCreateDialog] = useState<{
    type: CreateDialogType;
    companyId: string;
  } | null>(null);

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
  const usersByCompany =
    usersQuery.data ?? new Map<string, UserOnCompany[]>();

  const getMachineId = (companyId: string): string =>
    operationMachines.find((m) => m.companyId === companyId)?.machineId ?? "";

  const getOperatorId = (companyId: string): string =>
    operationOperators.find((o) => o.companyId === companyId)?.userId ?? "";

  const setMachineForCompany = (companyId: string, machineId: string) => {
    setOperationMachines((prev) => {
      const filtered = prev.filter((m) => m.companyId !== companyId);
      if (!machineId) return filtered;
      return [...filtered, { companyId, machineId }];
    });
  };

  const setOperatorForCompany = (companyId: string, userId: string) => {
    setOperationOperators((prev) => {
      const filtered = prev.filter((o) => o.companyId !== companyId);
      if (!userId) return filtered;
      return [...filtered, { companyId, userId }];
    });
  };

  const getUserFullName = (user: UserOnCompany): string => {
    if (user.user) {
      const fullName = `${user.user.name} ${user.user.surname}`.trim();
      return fullName || user.user.email || "-";
    }
    return user.userId;
  };

  if (selectedCompanies.length === 0) return <></>;

  const isLoading = machinesQuery.isLoading || usersQuery.isLoading;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">
          Operatori e macchinari
        </h3>
        <p className="text-xs text-neutral-500">
          Assegna un operatore e un macchinario per ogni azienda selezionata.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Caricamento operatori e macchinari...
        </div>
      ) : (
        <div className="space-y-3">
          {selectedCompanies.map((company) => {
            const machines = machinesByCompany.get(company.id) ?? [];
            const users = usersByCompany.get(company.id) ?? [];

            return (
              <div
                key={company.id}
                className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-3"
              >
                <p className="text-sm font-medium text-neutral-900">
                  {company.name}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-600">
                      Macchinario
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={getMachineId(company.id) || "__none__"}
                        onValueChange={(v) =>
                          setMachineForCompany(
                            company.id,
                            v === "__none__" ? "" : v,
                          )
                        }
                      >
                        <SelectTrigger className="flex-1 bg-white">
                          <SelectValue placeholder="Seleziona macchina" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Nessun macchinario
                          </SelectItem>
                          {machines.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() =>
                          setCreateDialog({
                            type: "machine",
                            companyId: company.id,
                          })
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-600">
                      Operatore
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={getOperatorId(company.id) || "__none__"}
                        onValueChange={(v) =>
                          setOperatorForCompany(
                            company.id,
                            v === "__none__" ? "" : v,
                          )
                        }
                      >
                        <SelectTrigger className="flex-1 bg-white">
                          <SelectValue placeholder="Seleziona operatore" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Nessun operatore
                          </SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.userId} value={u.userId}>
                              {getUserFullName(u)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() =>
                          setCreateDialog({
                            type: "operator",
                            companyId: company.id,
                          })
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createDialog && (
        <CreateResourceDialog
          type={createDialog.type}
          companyId={createDialog.companyId}
          companyName={
            selectedCompanies.find((c) => c.id === createDialog.companyId)
              ?.name ?? ""
          }
          onClose={() => setCreateDialog(null)}
          onCreated={(id) => {
            if (createDialog.type === "machine") {
              setMachineForCompany(createDialog.companyId, id);
              machinesQuery.refetch();
            } else {
              setOperatorForCompany(createDialog.companyId, id);
              usersQuery.refetch();
            }
            setCreateDialog(null);
          }}
        />
      )}
    </div>
  );
}

interface CreateResourceDialogProps {
  type: CreateDialogType;
  companyId: string;
  companyName: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}

function CreateResourceDialog({
  type,
  companyId,
  companyName,
  onClose,
  onCreated,
}: CreateResourceDialogProps): ReactElement {
  return type === "machine" ? (
    <CreateMachineDialog
      companyId={companyId}
      companyName={companyName}
      onClose={onClose}
      onCreated={onCreated}
    />
  ) : (
    <CreateOperatorDialog
      companyId={companyId}
      companyName={companyName}
      onClose={onClose}
      onCreated={onCreated}
    />
  );
}

function CreateMachineDialog({
  companyId,
  companyName,
  onClose,
  onCreated,
}: Omit<CreateResourceDialogProps, "type">): ReactElement {
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const { bulkCreate, isCreating } = useMachines(companyId);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      await bulkCreate([{ name: name.trim(), identifier: identifier.trim() }]);
      const machines = await machinesApiService.listByCompany(companyId);
      const created = machines.find((m) => m.name === name.trim());
      onCreated(created?.id ?? "");
    } catch {
      toast.error("Errore nella creazione del macchinario");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Nuovo macchinario
          </DialogTitle>
          <DialogDescription>
            Crea un nuovo macchinario per {companyName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="machine-name">Nome *</Label>
            <Input
              id="machine-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es: Atomizzatore 1000L"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="machine-identifier">Identificativo</Label>
            <Input
              id="machine-identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Es: AT-001"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isCreating}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateOperatorDialog({
  companyId,
  companyName,
  onClose,
  onCreated,
}: Omit<CreateResourceDialogProps, "type">): ReactElement {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const { addUser, isAdding } = useCompanyUsers(companyId);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    try {
      await addUser({ name: name.trim(), email: email.trim(), role: "EDITOR" });
      const response =
        await userOnCompanyApiService.listByCompany(companyId);
      const users = response.data?.users ?? [];
      const created = users.find((u) => u.user?.email === email.trim());
      onCreated(created?.userId ?? "");
    } catch {
      toast.error("Errore nell'aggiunta dell'operatore");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Nuovo operatore
          </DialogTitle>
          <DialogDescription>
            Aggiungi un operatore per {companyName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="operator-name">Nome *</Label>
            <Input
              id="operator-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es: Mario Rossi"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="operator-email">Email *</Label>
            <Input
              id="operator-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Es: mario.rossi@email.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAdding}>
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !email.trim() || isAdding}
          >
            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
