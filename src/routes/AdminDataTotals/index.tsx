import { FormEvent, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useMe, UserRole } from "@/hooks/useAuth";
import type { AdminApiError, AdminUserSummary } from "@/api/admin";
import {
  useAdminAccessStatusQuery,
  useAdminDashboardSummaryQuery,
  useAdminDeactivateUserMutation,
  useAdminReactivateUserMutation,
  useAdminSetUserBlockedMutation,
  useAdminUnlockMutation,
} from "@/hooks/useAdminDataTotals";
import { AdminAccessGate } from "./AdminAccessGate";
import { AdminSummaryCards } from "./AdminSummaryCards";
import { AdminUserActionDialog } from "./AdminUserActionDialog";
import { AdminUserDetailsDrawer } from "./AdminUserDetailsDrawer";
import { AdminUsersTable } from "./AdminUsersTable";

type PendingAction =
  | { type: "block"; user: AdminUserSummary }
  | { type: "unblock"; user: AdminUserSummary }
  | { type: "deactivate"; user: AdminUserSummary }
  | { type: "reactivate"; user: AdminUserSummary }
  | null;

function isForbiddenAdminError(error?: AdminApiError | null): boolean {
  return (
    error?.code === "ADMIN_EMAIL_NOT_ALLOWED" || error?.code === "ADMIN_ROLE_REQUIRED"
  );
}

function isUnlockExpiredError(error?: AdminApiError | null): boolean {
  return (
    error?.code === "ADMIN_UNLOCK_REQUIRED" || error?.code === "ADMIN_UNLOCK_EXPIRED"
  );
}

export default function AdminDataTotalsPage() {
  const { data: meData, isLoading: isLoadingMe } = useMe();
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const canQueryAdminArea = meData?.role === UserRole.ADMIN;
  const accessStatusQuery = useAdminAccessStatusQuery(canQueryAdminArea);
  const summaryQuery = useAdminDashboardSummaryQuery(
    canQueryAdminArea &&
      Boolean(accessStatusQuery.data?.data.isUnlocked) &&
      !isUnlockExpiredError(accessStatusQuery.error),
  );
  const unlockMutation = useAdminUnlockMutation();
  const blockMutation = useAdminSetUserBlockedMutation();
  const deactivateMutation = useAdminDeactivateUserMutation();
  const reactivateMutation = useAdminReactivateUserMutation();

  const isUnlocked =
    Boolean(accessStatusQuery.data?.data.isUnlocked) &&
    !isUnlockExpiredError(summaryQuery.error);

  const filteredUsers = useMemo(() => {
    const users = summaryQuery.data?.data.users ?? [];
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return users;
    }
    return users.filter((user) => {
      const haystacks = [
        user.name,
        user.surname ?? "",
        user.email,
        ...user.companies.map((company) => company.companyName),
      ];
      return haystacks.some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [search, summaryQuery.data?.data.users]);
  const allUsers = summaryQuery.data?.data.users ?? [];
  const selectedUser =
    allUsers.find((user) => user.userId === selectedUserId) ?? null;

  if (isLoadingMe || accessStatusQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={48} ariaLabel="Caricamento dashboard admin" />
      </div>
    );
  }

  if (!meData || meData.role !== UserRole.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isForbiddenAdminError(accessStatusQuery.error)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (accessStatusQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Errore accesso area admin</AlertTitle>
        <AlertDescription>{accessStatusQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  const handleUnlockSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await unlockMutation.mutateAsync({ password });
      setPassword("");
      toast.success("Area admin sbloccata");
    } catch (error) {
      toast.error("Password non valida", {
        description: error instanceof Error ? error.message : "Errore sconosciuto",
      });
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    try {
      if (pendingAction.type === "block" || pendingAction.type === "unblock") {
        await blockMutation.mutateAsync({
          userId: pendingAction.user.userId,
          isBlocked: pendingAction.type === "block",
        });
        toast.success(
          pendingAction.type === "block"
            ? "Utente bloccato con successo"
            : "Utente sbloccato con successo",
        );
      } else if (pendingAction.type === "deactivate") {
        await deactivateMutation.mutateAsync({ userId: pendingAction.user.userId });
        toast.success("Utente disattivato con successo");
      } else {
        await reactivateMutation.mutateAsync({ userId: pendingAction.user.userId });
        toast.success("Utente riattivato con successo");
      }
      setPendingAction(null);
    } catch (error) {
      toast.error("Operazione non completata", {
        description: error instanceof Error ? error.message : "Errore sconosciuto",
      });
    }
  };

  const blockingUserId = blockMutation.isPending ? blockMutation.variables?.userId : undefined;
  const deactivatingUserId = deactivateMutation.isPending
    ? deactivateMutation.variables?.userId
    : undefined;
  const reactivatingUserId = reactivateMutation.isPending
    ? reactivateMutation.variables?.userId
    : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Admin data totals</h1>
        <p className="text-sm text-slate-600">
          Vista aggregata degli utenti iscritti, aziende collegate e utilizzo della
          piattaforma.
        </p>
      </div>

      {!isUnlocked ? (
        <AdminAccessGate
          password={password}
          onPasswordChange={setPassword}
          onSubmit={handleUnlockSubmit}
          isSubmitting={unlockMutation.isPending}
          durationMinutes={accessStatusQuery.data?.data.durationMinutes ?? 30}
        />
      ) : summaryQuery.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size={48} ariaLabel="Caricamento dati admin" />
        </div>
      ) : summaryQuery.error && !isUnlockExpiredError(summaryQuery.error) ? (
        <Alert variant="destructive">
          <AlertTitle>Errore caricamento dati admin</AlertTitle>
          <AlertDescription>{summaryQuery.error.message}</AlertDescription>
        </Alert>
      ) : filteredUsers.length === 0 ? (
        <>
          <AdminSummaryCards totals={summaryQuery.data?.data.totals ?? emptyTotals} />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca per utente, email o azienda"
          />
          <Alert>
            <AlertTitle>Nessun risultato</AlertTitle>
            <AlertDescription>
              Nessun utente corrisponde ai filtri correnti.
            </AlertDescription>
          </Alert>
        </>
      ) : (
        <AdminUserDetailsDrawer
          user={selectedUser}
          open={selectedUser !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedUserId(null);
            }
          }}
        >
          <div className="space-y-6">
            <AdminSummaryCards totals={summaryQuery.data?.data.totals ?? emptyTotals} />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca per utente, email o azienda"
            />
            <AdminUsersTable
              users={filteredUsers}
              selectedUserId={selectedUserId}
              blockingUserId={blockingUserId}
              deactivatingUserId={deactivatingUserId}
              reactivatingUserId={reactivatingUserId}
              onSelectUser={setSelectedUserId}
              onToggleBlock={(user) =>
                setPendingAction({
                  type: user.isBlocked ? "unblock" : "block",
                  user,
                })
              }
              onDeactivate={(user) => setPendingAction({ type: "deactivate", user })}
              onReactivate={(user) => setPendingAction({ type: "reactivate", user })}
            />
          </div>
        </AdminUserDetailsDrawer>
      )}

      <AdminUserActionDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title={getDialogTitle(pendingAction)}
        description={getDialogDescription(pendingAction)}
        confirmLabel={getDialogConfirmLabel(pendingAction)}
        isSubmitting={
          blockMutation.isPending ||
          deactivateMutation.isPending ||
          reactivateMutation.isPending
        }
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}

const emptyTotals = {
  totalUsers: 0,
  inactiveUsers: 0,
  blockedUsers: 0,
  deactivatedUsers: 0,
  totalCompanies: 0,
  totalOwnedCompanies: 0,
  totalJobs: 0,
  totalJobGroups: 0,
};

function getDialogTitle(action: PendingAction): string {
  if (!action) return "";
  if (action.type === "block") return "Bloccare questo utente?";
  if (action.type === "unblock") return "Sbloccare questo utente?";
  if (action.type === "reactivate") return "Riattivare questo utente?";
  return "Disattivare questo utente?";
}

function getDialogDescription(action: PendingAction): string {
  if (!action) return "";
  if (action.type === "block") {
    return `L'utente ${action.user.email} non potrà più accedere alla piattaforma finché non verrà sbloccato.`;
  }
  if (action.type === "unblock") {
    return `L'utente ${action.user.email} tornerà ad accedere normalmente se non è disattivato.`;
  }
  if (action.type === "reactivate") {
    return `L'utente ${action.user.email} verrà riattivato e sbloccato per poter accedere nuovamente alla piattaforma.`;
  }
  return `L'utente ${action.user.email} verrà disattivato in modo sicuro senza cancellazione fisica dal database.`;
}

function getDialogConfirmLabel(action: PendingAction): string {
  if (!action) return "";
  if (action.type === "block") return "Blocca utente";
  if (action.type === "unblock") return "Sblocca utente";
  if (action.type === "reactivate") return "Riattiva utente";
  return "Disattiva utente";
}
