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
import { LandingNews } from "./LandingNews";
import { LandingProblem } from "./LandingProblem";
import { LandingUseCases } from "./LandingUseCases";
import { MobileCtaBar } from "./MobileCtaBar";

export default function Home() {
  const { t, i18n } = useTranslation();

  const faqItems = t("landing.faq.items", { returnObjects: true }) as FaqItem[];

  return (
    <div className="landing-page wrap">
      <Seo
        {...SEO.home}
        title={
          i18n.language.startsWith("en")
            ? "Seminai — AI for agricultural documents and farm data"
            : SEO.home.title
        }
        description={
          i18n.language.startsWith("en")
            ? "Connect invoices, delivery notes and field records with Seminai. Extract data, ask questions and prepare a field logbook for human review."
            : SEO.home.description
        }
        canonical={
          i18n.language.startsWith("en")
            ? "https://seminai.tech/en/"
            : "https://seminai.tech/"
        }
        locale={i18n.language.startsWith("en") ? "en_US" : "it_IT"}
        hreflang={false}
        alternates={[
          { hrefLang: "it", href: "https://seminai.tech/" },
          { hrefLang: "en", href: "https://seminai.tech/en/" },
          { hrefLang: "x-default", href: "https://seminai.tech/" },
        ]}
        markdownHref={
          i18n.language.startsWith("en")
            ? "https://seminai.tech/index.en.md"
            : "https://seminai.tech/index.md"
        }
        jsonLd={buildHomeGraph(
          faqItems,
          i18n.language.startsWith("en") ? "en" : "it",
        )}
      />
      <LandingNav />
      <main id="contenuto">
        <LandingHero />
        <LandingProblem />
        <LandingHowItWorks />
        <LandingUseCases />
        <LandingNews />
        <LandingFaq />
        <LandingBooking />
      </main>
      <LandingFooter />
      <MobileCtaBar />
    </div>
  );
}
