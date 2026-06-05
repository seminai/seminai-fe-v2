import { lazy, Suspense, useState, type ReactNode } from "react";
import { LandingFooter } from "./LandingFooter";
import { LandingNav } from "./LandingNav";
import "./landing.css";

const SendInvoicesEmailDialog = lazy(() =>
  import("@/components/organism/SendInvoicesEmailDialog").then((module) => ({
    default: module.SendInvoicesEmailDialog,
  })),
);

type LegalPageLayoutProps = {
  children: ReactNode;
};

export function LegalPageLayout({ children }: LegalPageLayoutProps) {
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  return (
    <div className="landing-page wrap legal-page">
      <LandingNav />
      <main className="legal-content container">{children}</main>
      <LandingFooter onOpenSendInvoices={() => setInvoiceDialogOpen(true)} />
      {invoiceDialogOpen && (
        <Suspense fallback={null}>
          <SendInvoicesEmailDialog
            open={invoiceDialogOpen}
            onOpenChange={setInvoiceDialogOpen}
          />
        </Suspense>
      )}
    </div>
  );
}
