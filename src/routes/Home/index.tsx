import { useTranslation } from "react-i18next";
import { Seo } from "@/components/molecules/Seo/Seo";
import { SEO } from "@/config/seo";
import { buildHomeGraph, type FaqItem } from "@/config/jsonLd";
import { LandingCapabilities } from "./LandingCapabilities";
import { LandingDemoCta } from "./LandingDemoCta";
import { LandingFaq } from "./LandingFaq";
import { LandingFooter } from "./LandingFooter";
import { LandingFork } from "./LandingFork";
import { LandingHero } from "./LandingHero";
import { LandingScenes } from "./LandingScenes";
import { LandingNav } from "./LandingNav";
import { LandingProblem } from "./LandingProblem";
import { LandingSolution } from "./LandingSolution";
import { LandingTrust } from "./LandingTrust";
import "./landing.css";

export default function Home() {
  const { t } = useTranslation();

  const faqItems = t("landing.faq.items", { returnObjects: true }) as FaqItem[];

  return (
    <div className="landing-page wrap">
      <Seo {...SEO.home} jsonLd={buildHomeGraph(faqItems)} />
      <LandingNav />
      <main id="contenuto">
        <LandingHero />
        <LandingProblem />
        <LandingSolution />
        <LandingCapabilities />
        <LandingScenes />
        <LandingTrust />
        <LandingFork />
        <LandingDemoCta />
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  );
}
