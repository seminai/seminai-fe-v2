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
  return (
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
              <TableHead>JobId</TableHead>
              <TableHead>Job non verificati</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.userId}
                className={cn(
                  "cursor-pointer",
                  selectedUserId === user.userId && "bg-slate-50",
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
                <TableCell>{user.unverifiedJobsCount}</TableCell>
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
  );
}
