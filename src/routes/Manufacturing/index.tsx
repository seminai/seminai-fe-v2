import { useTranslation } from "react-i18next";
import { Seo } from "@/components/molecules/Seo/Seo";
import { SEO } from "@/config/seo";
import { buildManufacturingGraph, type FaqItem } from "@/config/jsonLd";
import { LandingFaq } from "../Home/LandingFaq";
import { LandingFooter } from "../Home/LandingFooter";
import { LandingNav } from "../Home/LandingNav";
import { MigrationOffer } from "../Home/MigrationOffer";
import { RichHtml } from "../Home/RichHtml";
import {
  LANDING_REGISTER_URL,
  MANUFACTURING_CONTACT_URL,
} from "../Home/constants";
import {
  DdtWalkthrough,
  LoadWalkthrough,
  WarehouseChatWalkthrough,
} from "./ManufacturingScenes";
import "../Home/landing.css";

export default function Manufacturing() {
  const { t } = useTranslation();
  const faqItems = t("landing.manufacturing.faq.items", {
    returnObjects: true,
  }) as FaqItem[];

  return (
    <div className="landing-page wrap">
      <Seo {...SEO.manufacturing} jsonLd={buildManufacturingGraph(faqItems)} />
      <LandingNav />
      <main id="contenuto">
        <section className="hero">
          <div className="container">
            <h1 className="hero-title">
              <RichHtml html={t("landing.manufacturing.hero.title")} />
            </h1>
            <p className="hero-subtitle">
              <RichHtml html={t("landing.manufacturing.hero.subtitle")} />
            </p>
            <p className="hero-sub">{t("landing.manufacturing.hero.body")}</p>
            <div className="hero-ctas">
              <a href={LANDING_REGISTER_URL} className="btn-primary">
                {t("landing.manufacturing.hero.ctaPrimary")}
                <span className="arrow" aria-hidden="true" />
              </a>
              <a href={MANUFACTURING_CONTACT_URL} className="btn-secondary">
                {t("landing.manufacturing.hero.ctaSecondary")}
              </a>
            </div>
            <MigrationOffer />
            <div className="hero-preview">
              <DdtWalkthrough />
            </div>
          </div>
        </section>
        <section className="row" id="in-azione">
          <div className="container">
            <div className="section-head section-head-single">
              <div>
                <h2>
                  <RichHtml html={t("landing.manufacturing.show.title")} />
                </h2>
                <p className="lead">{t("landing.manufacturing.show.lead")}</p>
              </div>
            </div>
            <div className="scene-grid">
              <LoadWalkthrough />
              <WarehouseChatWalkthrough />
            </div>
          </div>
        </section>
        <LandingFaq
          titleKey="landing.manufacturing.faq.title"
          itemsKey="landing.manufacturing.faq.items"
        />
      </main>
      <LandingFooter />
    </div>
  );
}
