import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { InvoiceWalkthrough } from "./AgriScenes";
import { MigrationOffer } from "./MigrationOffer";
import { usePrefersReducedMotion } from "./walkthrough/useWalkthrough";

const OFFER_HASH = "#passaggio-dati";

function readInitialSlide(): number {
  if (typeof window === "undefined") return 0;
  return window.location.hash === OFFER_HASH ? 1 : 0;
}

export function HeroPreviewSlider() {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(readInitialSlide);
  const indexRef = useRef(index);
  const labels = t("landing.hero.slides", { returnObjects: true }) as string[];

  function select(next: number) {
    indexRef.current = next;
    setIndex(next);
  }

  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    const sync = () => {
      if (window.location.hash === OFFER_HASH) selectRef.current(1);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function handleCycleComplete() {
    if (reduced || indexRef.current !== 0) return;
    select(1);
  }

  return (
    <div
      className="hero-slider"
      role="region"
      aria-roledescription="carousel"
      aria-label={t("landing.hero.sliderLabel")}
    >
      <div className="hero-slider-viewport">
        <div
          className="hero-slider-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          <div className="hero-slide" aria-hidden={index !== 0} inert={index !== 0}>
            <InvoiceWalkthrough paused={index !== 0} onCycleComplete={handleCycleComplete} />
          </div>
          <div className="hero-slide" aria-hidden={index !== 1} inert={index !== 1}>
            <OfferSlide />
          </div>
        </div>
      </div>
      <div className="hero-slider-dots">
        {labels.map((label, dotIndex) => (
          <button
            key={label}
            type="button"
            className={`hero-slider-dot${dotIndex === index ? " is-active" : ""}`}
            aria-label={t("landing.hero.slideLabel", { index: dotIndex + 1, name: label })}
            aria-current={dotIndex === index ? "true" : undefined}
            onClick={() => select(dotIndex)}
          />
        ))}
      </div>
    </div>
  );
}

function OfferSlide() {
  const { t } = useTranslation();

  return (
    <figure className="walkthrough">
      <div className="demo-frame">
        <div className="demo-bar">
          <span className="dot d1" />
          <span className="dot d2" />
          <span className="dot d3" />
          <span className="demo-url">{t("landing.offer.url")}</span>
        </div>
        <div className="demo-body hero-offer-body">
          <MigrationOffer />
        </div>
      </div>
      <figcaption className="demo-caption">{t("landing.offer.caption")}</figcaption>
    </figure>
  );
}
