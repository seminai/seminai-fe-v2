import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminDashboardSummaryResponse } from "@/api/admin";

type AdminSummaryCardsProps = {
  totals: AdminDashboardSummaryResponse["data"]["totals"];
};

const numberFormatter = new Intl.NumberFormat("it-IT");

const cards = [
  { key: "totalUsers", label: "Utenti totali" },
  { key: "inactiveUsers", label: "Utenti inattivi" },
  { key: "blockedUsers", label: "Utenti bloccati" },
  { key: "deactivatedUsers", label: "Utenti disattivati" },
  { key: "totalCompanies", label: "Aziende totali" },
  { key: "totalJobGroups", label: "Piani trattamento" },
] as const;

export function AdminSummaryCards({ totals }: AdminSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.key} className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">
              {numberFormatter.format(totals[card.key])}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
