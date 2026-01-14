import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { type Company, type BulkCompanyUpdateInput } from "@/api/companies";
import { useCompanies } from "@/hooks/useCompanies";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { DrawerCompanyContent } from "./DrawerCompany";

interface BreadcrumbNode {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

type ActiveTab = "details" | "users" | "warehouses" | "files" | "machines";

class CompanyDetailPageController {
  private readonly companyId: string;
  private readonly tabLabels: Record<ActiveTab, string> = {
    details: "Dettagli",
    users: "Utenti",
    warehouses: "Magazzini",
    files: "File",
    machines: "Macchine",
  };

  public constructor(companyId: string) {
    this.companyId = companyId;
  }

  public findCompany(companies: Company[]): Company | undefined {
    return companies.find((company) => company.id === this.companyId);
  }

  public buildBreadcrumbNodes(
    company?: Company,
    activeTab?: ActiveTab
  ): BreadcrumbNode[] {
    const nodes: BreadcrumbNode[] = [{ label: "Aziende", href: "/company" }];

    if (activeTab && activeTab !== "details") {
      // Se siamo su un tab diverso da "details", il nome azienda è cliccabile
      nodes.push({
        label: company?.name ?? "Dettaglio",
        href: `/company/${this.companyId}`,
      });
      // E aggiungiamo il tab corrente
      nodes.push({
        label: this.tabLabels[activeTab],
        isCurrent: true,
      });
    } else {
      // Se siamo su "details", il nome azienda è la pagina corrente
      nodes.push({
        label: company?.name ?? "Dettaglio",
        isCurrent: true,
      });
    }

    return nodes;
  }

  public getPageTitle(company?: Company): string {
    return company?.name ?? "Dettaglio Azienda";
  }

  public handleUpdate(
    updateFn: (payload: BulkCompanyUpdateInput[]) => void,
    update: BulkCompanyUpdateInput
  ): void {
    if (!update.id) {
      return;
    }
    updateFn([update]);
  }
}

export default function CompanyDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const companyId = params.id ?? "";
  const controller = React.useMemo(
    () => new CompanyDetailPageController(companyId),
    [companyId]
  );

  const { companies, isLoading, error, updateCompanies, isUpdating, refetch } =
    useCompanies();

  const [activeTab, setActiveTab] = React.useState<ActiveTab>("details");

  const company = React.useMemo(
    () => controller.findCompany(companies),
    [controller, companies]
  );
  const breadcrumbNodes = React.useMemo(
    () => controller.buildBreadcrumbNodes(company, activeTab),
    [controller, company, activeTab]
  );

  const handleUpdate = React.useCallback(
    (update: BulkCompanyUpdateInput): void => {
      controller.handleUpdate(updateCompanies, update);
    },
    [controller, updateCompanies]
  );

  const handleTabChange = React.useCallback((tab: ActiveTab): void => {
    setActiveTab(tab);
  }, []);

  const glassPanelClass = "bg-white p-4 md:p-8";

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        const tab = value as ActiveTab;
        handleTabChange(tab);
      }}
      className="flex flex-col min-h-screen"
    >
      {/* Sticky Header with Breadcrumb and Tabs */}
      <div className="sticky top-4 z-50 bg-transparent">
        <div className="px-4 md:px-6 w-full">
          <div className="mx-auto w-full">
            {/* Mobile: vertical layout, Desktop: horizontal layout */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 py-3 md:py-3">
              {/* Breadcrumb */}
              <Breadcrumb className="w-full md:flex-1 md:min-w-0 text-xs md:text-sm text-muted-foreground">
                <BreadcrumbList className="flex-wrap">
                  {breadcrumbNodes.map((node, index) => (
                    <React.Fragment key={`${node.label}-${index}`}>
                      <BreadcrumbItem>
                        {node.href && !node.isCurrent ? (
                          <BreadcrumbLink
                            asChild
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Link to={node.href}>{node.label}</Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="text-foreground">
                            {node.label}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbNodes.length - 1 ? (
                        <BreadcrumbSeparator />
                      ) : null}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>

              {/* Tabs */}
              <div className="w-full md:flex-shrink-0 md:w-auto">
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 w-full md:w-auto">
                  <TabsList className="inline-flex w-auto">
                    <TabsTrigger
                      value="details"
                      className="text-xs md:text-sm whitespace-nowrap"
                    >
                      Dettagli
                    </TabsTrigger>
                    <TabsTrigger
                      value="users"
                      className="text-xs md:text-sm whitespace-nowrap"
                    >
                      Utenti
                    </TabsTrigger>
                    <TabsTrigger
                      value="warehouses"
                      className="text-xs md:text-sm whitespace-nowrap"
                    >
                      Magazzini
                    </TabsTrigger>
                    <TabsTrigger
                      value="files"
                      className="text-xs md:text-sm whitespace-nowrap"
                    >
                      File
                    </TabsTrigger>
                    <TabsTrigger
                      value="machines"
                      className="text-xs md:text-sm whitespace-nowrap"
                    >
                      Macchine
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 md:px-6 pb-24 md:pb-10 w-full pt-16">
        <div className="mx-auto space-y-6">
          {isLoading ? (
            <div className={glassPanelClass}>
              <div className="flex items-center gap-3 text-base text-muted-foreground">
                <Spinner size={20} ariaLabel="Caricamento azienda" />
                <span>Caricamento azienda…</span>
              </div>
            </div>
          ) : error ? (
            <div className={glassPanelClass}>
              <p className="text-base font-semibold text-red-700">
                Impossibile caricare le aziende.
              </p>
              <p className="text-sm text-red-500/80 mt-2">
                {error instanceof Error ? error.message : "Errore sconosciuto"}
              </p>
            </div>
          ) : !company ? (
            <div className={glassPanelClass}>
              <p className="text-base font-semibold text-yellow-900">
                Azienda non trovata
              </p>
              <p className="text-sm text-yellow-800/80 mt-2">
                L&apos;elemento richiesto non è più disponibile.{" "}
                <Link
                  to="/company"
                  className="font-medium underline text-agri-green-600 hover:text-agri-green-700"
                >
                  Torna alla lista delle aziende
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className={glassPanelClass}>
              <DrawerCompanyContent
                company={company}
                onUpdate={handleUpdate}
                isUpdating={isUpdating}
                onUpdateSuccess={() => {
                  void refetch();
                }}
                onTabChange={handleTabChange}
                activeTab={activeTab}
              />
            </div>
          )}
        </div>
      </div>
    </Tabs>
  );
}
