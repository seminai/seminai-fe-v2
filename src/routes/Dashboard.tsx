import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useJobs } from "@/hooks/useJobs";
import { useCompanies } from "@/hooks/useCompanies";
import { useProducts } from "@/hooks/useProducts";
import { useLabelsSummary } from "@/hooks/useLabelsSummary";
import { useMe, UserRole } from "@/hooks/useAuth";
import { PageHeader } from "@/components/organism/Header";
import { Button } from "@/components/ui/button";
import TasksAgriIcon from "@/components/icons/TasksAgriIcon";
import BarnAgriIcon from "@/components/icons/BarnAgriIcon";
import BottleAgriIcon from "@/components/icons/BottleAgriIcon";
import TagAgriIcon from "@/components/icons/TagAgriIcon";
import { IoChevronForwardOutline, IoAddCircleOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";
import type { LabelSummary } from "@/api/labels";

type DashboardCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  onClick?: () => void;
  isLoading?: boolean;
};

function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
  onClick,
  isLoading,
}: DashboardCardProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={!onClick || isLoading}
      className={cn(
        "group relative overflow-hidden rounded-3xl p-6 transition-all duration-300",
        "backdrop-blur-xl bg-white/70 border border-white/40",
        "shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.1)]",
        onClick &&
          !isLoading &&
          "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        isLoading && "opacity-50 cursor-wait"
      )}
    >
      {/* Gradient background */}
      <div
        className={cn(
          "absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300",
          gradient
        )}
      />

      {/* Content */}
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-2xl",
                "bg-gradient-to-br shadow-sm",
                gradient.replace("from-", "from-").replace("to-", "to-"),
                "bg-opacity-10"
              )}
            >
              <div className="text-neutral-700">{icon}</div>
            </div>
            {onClick && !isLoading && (
              <IoChevronForwardOutline className="ml-auto text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-1 transition-all duration-200" />
            )}
          </div>

          <h3 className="text-sm font-medium text-neutral-500 mb-2">{title}</h3>

          {isLoading ? (
            <div className="h-10 w-24 bg-neutral-200 rounded-lg animate-pulse" />
          ) : (
            <div className="text-4xl font-semibold text-neutral-900 mb-1 tabular-nums">
              {value}
            </div>
          )}

          <p className="text-sm text-neutral-600">{subtitle}</p>
        </div>
      </div>

      {/* Hover effect border */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/5 group-hover:ring-black/10 transition-all duration-300" />
    </button>
  );
}

type DashboardSkeletonProps = {
  cards?: number;
};

function DashboardSkeleton({
  cards = 3,
}: DashboardSkeletonProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="rounded-3xl p-6 backdrop-blur-xl bg-white/70 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-200 animate-pulse" />
          </div>
          <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse mb-3" />
          <div className="h-10 w-32 bg-neutral-200 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-40 bg-neutral-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

class LabelDashboardMetrics {
  private readonly verified: number;
  private readonly pending: number;
  private readonly total: number;

  constructor(labels: LabelSummary[]) {
    this.verified = labels.filter((label) => label.isVerified).length;
    this.total = labels.length;
    this.pending = this.total - this.verified;
  }

  public getVerifiedCount(): number {
    return this.verified;
  }

  public getPendingCount(): number {
    return this.pending;
  }

  public getTotalCount(): number {
    return this.total;
  }

  public hasPending(): boolean {
    return this.pending > 0;
  }
}

function GeneralDashboard(): React.ReactElement {
  const navigate = useNavigate();
  const { jobs, isLoading: isLoadingJobs } = useJobs();
  const { companies, isLoading: isLoadingCompanies } = useCompanies();
  const { products, isLoading: isLoadingProducts } = useProducts();

  // Calcola operazioni da verificare
  const unverifiedJobs = React.useMemo(() => {
    return jobs.filter((jobWithRelations) => !jobWithRelations.job.isVerified);
  }, [jobs]);

  // Calcola prodotti sotto stock (soglia: < 10 unità totali)
  const lowStockProducts = React.useMemo(() => {
    return products.filter((product) => {
      const totalStock = product.stocks.reduce((sum, stock) => {
        return stock.type === "IN"
          ? sum + stock.quantity
          : sum - stock.quantity;
      }, 0);
      return totalStock < 10 && totalStock >= 0;
    });
  }, [products]);

  const isLoading = isLoadingJobs || isLoadingCompanies || isLoadingProducts;

  const quickCreateButton = (
    <Button
      onClick={() => navigate("/create-company-field-production")}
      className="gap-2"
    >
      <IoAddCircleOutline className="w-5 h-5" />
      Crea Rapido
    </Button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader title="Dashboard" rightElement={quickCreateButton} />

        <div className="flex-1 overflow-auto p-6 ">
          <div className="max-w-7xl mx-auto">
            <DashboardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Dashboard" rightElement={quickCreateButton} />

      <div className="flex-1 overflow-auto p-6 ">
        <div className="max-w-7xl mx-auto">
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Operazioni da verificare */}
            <DashboardCard
              title="Operazioni da Verificare"
              value={unverifiedJobs.length}
              subtitle={
                unverifiedJobs.length === 1
                  ? "operazione richiede verifica"
                  : "operazioni richiedono verifica"
              }
              icon={<TasksAgriIcon size={24} />}
              gradient="from-amber-400 to-orange-500"
              onClick={() => navigate("/job")}
              isLoading={isLoadingJobs}
            />

            {/* Aziende registrate */}
            <DashboardCard
              title="Aziende Registrate"
              value={companies.length}
              subtitle={
                companies.length === 1
                  ? "azienda nel sistema"
                  : "aziende nel sistema"
              }
              icon={<BarnAgriIcon size={24} />}
              gradient="from-green-400 to-emerald-600"
              onClick={() => navigate("/company")}
              isLoading={isLoadingCompanies}
            />

            {/* Prodotti sotto stock */}
            <DashboardCard
              title="Prodotti Sotto Stock"
              value={lowStockProducts.length}
              subtitle={
                lowStockProducts.length === 1
                  ? "prodotto sotto la soglia minima"
                  : "prodotti sotto la soglia minima"
              }
              icon={<BottleAgriIcon size={24} />}
              gradient="from-red-400 to-rose-600"
              onClick={() => navigate("/products")}
              isLoading={isLoadingProducts}
            />
          </div>

          {/* Quick insights */}
          {!isLoading && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Info card per operazioni */}
              {unverifiedJobs.length > 0 && (
                <div className="rounded-2xl p-5 bg-amber-50/50 border border-amber-100">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <span className="text-lg">⚠️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-amber-900 mb-1">
                        Attenzione
                      </h4>
                      <p className="text-sm text-amber-700">
                        Hai operazioni in attesa di verifica. Clicca sulla card
                        per rivederle.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info card per prodotti sotto stock */}
              {lowStockProducts.length > 0 && (
                <div className="rounded-2xl p-5 bg-rose-50/50 border border-rose-100">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                      <span className="text-lg">📦</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-rose-900 mb-1">
                        Stock Basso
                      </h4>
                      <p className="text-sm text-rose-700">
                        Alcuni prodotti stanno per esaurirsi. Considera di
                        riordinarli.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info card generale */}
              {companies.length > 0 && (
                <div className="rounded-2xl p-5 bg-green-50/50 border border-green-100">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <span className="text-lg">✅</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-green-900 mb-1">
                        Sistema Attivo
                      </h4>
                      <p className="text-sm text-green-700">
                        {companies.length === 1
                          ? "La tua azienda è"
                          : `Le tue ${companies.length} aziende sono`}{" "}
                        configurata{companies.length > 1 ? "e" : ""} e pronta
                        {companies.length > 1 ? "e" : ""} per le operazioni.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state se non ci sono dati */}
          {!isLoading &&
            companies.length === 0 &&
            jobs.length === 0 &&
            products.length === 0 && (
              <div className="mt-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                  <BarnAgriIcon size={40} className="text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  Benvenuto nella Dashboard
                </h3>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                  Inizia creando la tua prima azienda per gestire le operazioni
                  agricole.
                </p>
                <button
                  onClick={() => navigate("/company")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
                >
                  <BarnAgriIcon size={20} />
                  Crea la tua prima azienda
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function LabelManagerDashboard(): React.ReactElement {
  const navigate = useNavigate();
  const { labels, isLoading } = useLabelsSummary();

  const metrics = React.useMemo(() => {
    return new LabelDashboardMetrics(labels);
  }, [labels]);

  const verifiedCount = metrics.getVerifiedCount();
  const pendingCount = metrics.getPendingCount();
  const totalCount = metrics.getTotalCount();

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader title="Dashboard" />

        <div className="flex-1 overflow-auto p-6 ">
          <div className="max-w-4xl mx-auto">
            <DashboardSkeleton cards={2} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Dashboard" />

      <div className="flex-1 overflow-auto p-6 ">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardCard
              title="Etichette Verificate"
              value={verifiedCount}
              subtitle={
                verifiedCount === 1
                  ? "etichetta confermata"
                  : "etichette confermate"
              }
              icon={<TagAgriIcon size={24} />}
              gradient="from-emerald-400 to-green-600"
              onClick={() => navigate("/label")}
              isLoading={isLoading}
            />

            <DashboardCard
              title="Etichette da Verificare"
              value={pendingCount}
              subtitle={
                pendingCount === 1
                  ? "etichetta richiede verifica"
                  : "etichette richiedono verifica"
              }
              icon={<TagAgriIcon size={24} />}
              gradient="from-amber-400 to-orange-500"
              onClick={() => navigate("/label")}
              isLoading={isLoading}
            />
          </div>

          {(pendingCount > 0 || totalCount === 0) && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingCount > 0 && (
                <div className="rounded-2xl p-5 bg-amber-50/50 border border-amber-100">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <span className="text-lg">⚠️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-amber-900 mb-1">
                        Verifiche in sospeso
                      </h4>
                      <p className="text-sm text-amber-700">
                        Ci sono etichette in attesa di conferma. Accedi alla
                        lista per completare la revisione.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {totalCount === 0 && (
                <div className="rounded-2xl p-5 bg-neutral-50 border border-neutral-100">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <span className="text-lg">📄</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-neutral-900 mb-1">
                        Nessuna etichetta caricata
                      </h4>
                      <p className="text-sm text-neutral-700 mb-4">
                        Carica o estrai le prime etichette per iniziare la fase
                        di verifica.
                      </p>
                      <button
                        onClick={() => navigate("/label")}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                      >
                        <TagAgriIcon size={18} />
                        Vai alle etichette
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard(): React.ReactElement {
  const { data: meData, isLoading: isLoadingMe } = useMe();

  if (isLoadingMe) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader title="Dashboard" />

        <div className="flex-1 overflow-auto p-6 ">
          <div className="max-w-7xl mx-auto">
            <DashboardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (meData?.role === UserRole.LABEL_MANAGER) {
    return <LabelManagerDashboard />;
  }

  return <GeneralDashboard />;
}
