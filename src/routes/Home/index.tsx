import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Seo } from "@/components/molecules/Seo/Seo";
import { SEO } from "@/config/seo";
import { buildHomeGraph, type FaqItem } from "@/config/jsonLd";
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
import "./landing.css";

const SendInvoicesEmailDialog = lazy(() =>
  import("@/components/organism/SendInvoicesEmailDialog").then((module) => ({
    default: module.SendInvoicesEmailDialog,
  })),
);

export default function Home() {
  const { t } = useTranslation();
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const openSendInvoices = () => setInvoiceDialogOpen(true);

  const faqItems = t("landing.faq.items", { returnObjects: true }) as FaqItem[];

  return (
    <div className="landing-page wrap">
      <Seo {...SEO.home} jsonLd={buildHomeGraph(faqItems)} />
      <LandingNav />
      <main>
        <LandingHero onOpenSendInvoices={openSendInvoices} />
        <LandingProblem />
        <LandingSolution />
        <LandingTrust />
        <LandingFork />
        <LandingPricing />
        <LandingMagnet onOpenSendInvoices={openSendInvoices} />
        <LandingFaq />
      </main>
      <LandingFooter onOpenSendInvoices={openSendInvoices} />
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
