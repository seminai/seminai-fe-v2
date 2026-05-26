import { useState } from "react";
import { SendInvoicesEmailDialog } from "@/components/organism/SendInvoicesEmailDialog";
import "./landing.css";
import { LandingFaq } from "./LandingFaq";
import { LandingFooter } from "./LandingFooter";
import { LandingFork } from "./LandingFork";
import { LandingHero } from "./LandingHero";
import { LandingMagnet } from "./LandingMagnet";
import { LandingNav } from "./LandingNav";
import { LandingPricing } from "./LandingPricing";
import { LandingProblem } from "./LandingProblem";
import { LandingSolution } from "./LandingSolution";
import { LandingTrust } from "./LandingTrust";

export default function Home() {
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const openSendInvoices = () => setInvoiceDialogOpen(true);

  return (
    <div className="landing-page wrap">
      <LandingNav />
      <LandingHero onOpenSendInvoices={openSendInvoices} />
      <LandingProblem />
      <LandingSolution />
      <LandingTrust />
      <LandingFork />
      <LandingPricing />
      <LandingMagnet onOpenSendInvoices={openSendInvoices} />
      <LandingFaq />
      <LandingFooter onOpenSendInvoices={openSendInvoices} />
      <SendInvoicesEmailDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
      />
    </div>
  );
}
