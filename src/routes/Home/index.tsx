import { useTranslation } from "react-i18next";
import { Seo } from "@/components/molecules/Seo/Seo";
import { SEO } from "@/config/seo";
import { buildHomeGraph, type FaqItem } from "@/config/jsonLd";
import { LandingBooking } from "./LandingBooking";
import { LandingFaq } from "./LandingFaq";
import { LandingFooter } from "./LandingFooter";
import { LandingHero } from "./LandingHero";
import { LandingHowItWorks } from "./LandingHowItWorks";
import { LandingNav } from "./LandingNav";
import { LandingProblem } from "./LandingProblem";
import { LandingUseCases } from "./LandingUseCases";
import { MobileCtaBar } from "./MobileCtaBar";
import "./landing.css";
import "./home.css";

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
        <LandingHowItWorks />
        <LandingUseCases />
        <LandingFaq />
        <LandingBooking />
      </main>
      <LandingFooter />
      <MobileCtaBar />
    </div>
  );
}
