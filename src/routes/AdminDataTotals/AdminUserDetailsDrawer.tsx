import { X } from "lucide-react";
import type { AdminUserSummary } from "@/api/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminUserDetailsDrawerProps = {
  user: AdminUserSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminUserDetailsDrawer({
  user,
  open,
  onOpenChange,
}: AdminUserDetailsDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      modal
      dismissible
    >
      <DrawerContent className="w-[50vw] max-w-none min-w-[320px]">
        <div className="flex h-full flex-col overflow-hidden">
          <DrawerHeader className="border-b border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <DrawerTitle>Dettaglio utente</DrawerTitle>
                <DrawerDescription>
                  Metriche per utente, aziende collegate e stato operativo.
                </DrawerDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="Chiudi dettaglio utente"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {user ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-xl font-semibold text-slate-900">
                    {user.name} {user.surname ?? ""}
                  </div>
                  <div className="text-sm text-slate-600">{user.email}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{user.role}</Badge>
                    {renderUserStatus(user)}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <MetricCard label="Aziende create" value={user.ownedCompaniesCount} />
                  <MetricCard label="Aziende associate" value={user.associatedCompaniesCount} />
                  <MetricCard label="JobId distinti" value={user.jobGroupsCount} />
                  <MetricCard label="Job totali" value={user.jobsCount} />
                  <MetricCard label="Job non verificati" value={user.unverifiedJobsCount} />
                  <MetricCard
                    label="Ultimo accesso"
                    value={formatLastAccessSummary(user)}
                    isText
                  />
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
                        {user.companies.map((company) => (
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
              </div>
            ) : (
              <p className="text-sm text-slate-600">Seleziona un utente per vedere il dettaglio.</p>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
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

function formatLastAccessSummary(user: AdminUserSummary): string {
  if (!user.lastAccessAt) {
    return "Mai";
  }
  const parsed = new Date(user.lastAccessAt);
  if (Number.isNaN(parsed.getTime())) {
    return user.lastAccessAt;
  }
  return `${new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed)}${user.daysSinceLastAccess === null ? "" : ` • ${user.daysSinceLastAccess} giorni fa`}`;
}

function MetricCard({
  label,
  value,
  isText = false,
}: {
  label: string;
  value: number | string;
  isText?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={isText ? "mt-1 text-sm font-medium text-slate-900" : "mt-1 text-2xl font-semibold text-slate-900"}
      >
        {value}
      </div>
    </div>
  );
}
