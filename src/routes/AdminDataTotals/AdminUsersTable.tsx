import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AdminUserSummary } from "@/api/admin";

type AdminUsersTableProps = {
  users: AdminUserSummary[];
  selectedUserId: string | null;
  blockingUserId?: string;
  deactivatingUserId?: string;
  onSelectUser: (userId: string) => void;
  onToggleBlock: (user: AdminUserSummary) => void;
  onDeactivate: (user: AdminUserSummary) => void;
};

const dateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatLastAccess(value: string | null): string {
  if (!value) return "Mai";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return dateTimeFormatter.format(parsed);
}

function renderUserStatus(user: AdminUserSummary) {
  if (user.isDeactivated) {
    return <Badge variant="destructive">Disattivato</Badge>;
  }
  if (user.isBlocked) {
    return <Badge variant="destructive">Bloccato</Badge>;
  }
  if (user.isInactive) {
    return <Badge variant="secondary">Inattivo</Badge>;
  }
  return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Attivo</Badge>;
}

export function AdminUsersTable({
  users,
  selectedUserId,
  blockingUserId,
  deactivatingUserId,
  onSelectUser,
  onToggleBlock,
  onDeactivate,
}: AdminUsersTableProps) {
  const selectedUser = users.find((user) => user.userId === selectedUserId) ?? users[0] ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Utenti registrati</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Ultimo accesso</TableHead>
                <TableHead>Aziende</TableHead>
                <TableHead>Piani</TableHead>
                <TableHead>Job</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.userId}
                  className={cn(
                    "cursor-pointer",
                    selectedUser?.userId === user.userId && "bg-slate-50",
                  )}
                  onClick={() => onSelectUser(user.userId)}
                >
                  <TableCell className="font-medium text-slate-900">
                    {user.name} {user.surname ?? ""}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{renderUserStatus(user)}</TableCell>
                  <TableCell>
                    <div>{formatLastAccess(user.lastAccessAt)}</div>
                    <div className="text-xs text-slate-500">
                      {user.daysSinceLastAccess === null
                        ? "nessun accesso registrato"
                        : `${user.daysSinceLastAccess} giorni fa`}
                    </div>
                  </TableCell>
                  <TableCell>{user.totalRelevantCompaniesCount}</TableCell>
                  <TableCell>{user.jobGroupsCount}</TableCell>
                  <TableCell>{user.jobsCount}</TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex justify-end gap-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={user.isDeactivated || blockingUserId === user.userId}
                        onClick={() => onToggleBlock(user)}
                      >
                        {blockingUserId === user.userId
                          ? "..."
                          : user.isBlocked
                            ? "Sblocca"
                            : "Blocca"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={user.isDeactivated || deactivatingUserId === user.userId}
                        onClick={() => onDeactivate(user)}
                      >
                        {deactivatingUserId === user.userId ? "..." : "Disattiva"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Dettaglio utente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedUser ? (
            <>
              <div className="space-y-1">
                <div className="text-lg font-semibold text-slate-900">
                  {selectedUser.name} {selectedUser.surname ?? ""}
                </div>
                <div className="text-sm text-slate-600">{selectedUser.email}</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedUser.role}</Badge>
                  {renderUserStatus(selectedUser)}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <MetricCard label="Aziende create" value={selectedUser.ownedCompaniesCount} />
                <MetricCard
                  label="Aziende associate"
                  value={selectedUser.associatedCompaniesCount}
                />
                <MetricCard label="Piani trattamento" value={selectedUser.jobGroupsCount} />
                <MetricCard label="Job totali" value={selectedUser.jobsCount} />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-900">Aziende collegate</div>
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Azienda</TableHead>
                        <TableHead>Relazione</TableHead>
                        <TableHead>Utenti</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Unità</TableHead>
                        <TableHead>Prodotti</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUser.companies.map((company) => (
                        <TableRow key={company.companyId}>
                          <TableCell className="font-medium">{company.companyName}</TableCell>
                          <TableCell>
                            {company.relationshipType}
                            {company.companyRole ? ` • ${company.companyRole}` : ""}
                          </TableCell>
                          <TableCell>{company.usersCount}</TableCell>
                          <TableCell>{company.fieldsCount}</TableCell>
                          <TableCell>{company.productionUnitsCount}</TableCell>
                          <TableCell>{company.warehouseProductsCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">Seleziona un utente per vedere il dettaglio.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
