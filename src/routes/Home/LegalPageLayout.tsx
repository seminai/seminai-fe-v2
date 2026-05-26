import { useState, type ReactNode } from "react";
import { SendInvoicesEmailDialog } from "@/components/organism/SendInvoicesEmailDialog";
import "./landing.css";
import { LandingFooter } from "./LandingFooter";
import { LandingNav } from "./LandingNav";

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
      <SendInvoicesEmailDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
      />
    </div>
  );
}
