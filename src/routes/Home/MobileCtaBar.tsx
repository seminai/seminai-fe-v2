import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ANCHORS } from "./constants";

/**
 * Phone-only booking button pinned to the bottom of the screen (hidden by CSS from 881px).
 * Shows once the hero buttons scroll away and hides again over the form and the footer,
 * where it would only cover what the visitor is reading.
 */
export function MobileCtaBar() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const targets = [".hero-ctas", "#prenota", "footer"]
      .map((selector) => document.querySelector(selector))
      .filter((element): element is Element => element !== null);
    if (targets.length === 0) return;

    const onScreen = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      // Before the hero buttons have scrolled away nothing is shown; afterwards only when no target is on screen.
      const heroAbove = targets[0].getBoundingClientRect().bottom < 0;
      setVisible(heroAbove && onScreen.size === 0);
    });
    targets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`mobile-cta${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
      <a href={ANCHORS.booking} className="btn-primary" tabIndex={visible ? 0 : -1}>
        {t("landing.nav.demo")}
        <span className="arrow" aria-hidden="true" />
      </a>
    </div>
  );
}
