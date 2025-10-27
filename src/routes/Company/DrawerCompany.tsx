import * as React from "react";
import { type Company } from "@/api/companies";
import { Button } from "@/components/ui/button";
import { MapPin, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DrawerCompanyContentProps {
  company: Company;
}

/**
 * DrawerCompanyContent - Componente funzionale per visualizzare i dettagli completi di un'azienda
 * Organizza le informazioni in sezioni logiche
 */
export function DrawerCompanyContent({
  company,
}: DrawerCompanyContentProps): React.ReactElement {
  const navigate = useNavigate();

  const renderGeneralInfo = (): React.ReactNode => {
    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Informazioni Generali
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Nome Azienda</p>
            <p className="text-sm font-medium">{company.name}</p>
          </div>
          {company.logoUrl && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Logo</p>
              <img
                src={company.logoUrl}
                alt={`Logo ${company.name}`}
                className="h-12 object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFiscalInfo = (): React.ReactNode => {
    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Dati Fiscali
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Partita IVA</p>
            <p className="text-sm font-medium">{company.vatNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Codice Fiscale</p>
            <p className="text-sm font-medium">{company.fiscalCode}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderAddressInfo = (): React.ReactNode => {
    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Indirizzo
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Indirizzo</p>
            <p className="text-sm font-medium">{company.address || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Città</p>
            <p className="text-sm font-medium">{company.city || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CAP</p>
            <p className="text-sm font-medium">{company.cap || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nazione</p>
            <p className="text-sm font-medium">{company.nation || "-"}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderContactInfo = (): React.ReactNode => {
    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Contatti
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium">
              {company.email ? (
                <a
                  href={`mailto:${company.email}`}
                  className="text-primary hover:underline"
                >
                  {company.email}
                </a>
              ) : (
                "-"
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Telefono</p>
            <p className="text-sm font-medium">
              {company.phoneNumber ? (
                <a
                  href={`tel:${company.phoneNumber}`}
                  className="text-primary hover:underline"
                >
                  {company.phoneNumber}
                </a>
              ) : (
                "-"
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sito Web</p>
            <p className="text-sm font-medium">
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {company.website}
                </a>
              ) : (
                "-"
              )}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderActions = (): React.ReactNode => {
    return (
      <div className="pt-4 border-t">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Azioni
        </h3>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => navigate("/fields")}
          >
            <MapPin className="h-4 w-4" />
            Visualizza Campi
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled
          >
            <Building2 className="h-4 w-4" />
            Gestione Azienda
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderGeneralInfo()}
      {renderFiscalInfo()}
      {renderAddressInfo()}
      {renderContactInfo()}
      {renderActions()}
    </div>
  );
}
