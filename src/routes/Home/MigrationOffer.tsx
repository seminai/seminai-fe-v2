import { useTranslation } from "react-i18next";
import { useMigrationOffer } from "./useMigrationOffer";

export function MigrationOffer() {
  const { t } = useTranslation();
  const offer = useMigrationOffer();
  const isFull = offer.remaining <= 0;
  const percent = offer.cap > 0 ? Math.round((offer.taken / offer.cap) * 100) : 0;

  return (
    <aside className="migration-offer" id="passaggio-dati">
      <div>
        <p className="migration-offer-kicker">{t("landing.offer.kicker")}</p>
        <p className="migration-offer-title">
          {isFull ? t("landing.offer.full") : t("landing.offer.title")}
        </p>
      </div>
      <div>
        <div className="counter-num">
          {offer.taken}
          <span>/{offer.cap}</span>
        </div>
        <div className="counter-label">
          {isFull
            ? t("landing.offer.fullLabel")
            : t("landing.offer.remaining", { spots: offer.remaining })}
        </div>
        <div
          className="counter-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={offer.cap}
          aria-valuenow={offer.taken}
          aria-label={t("landing.offer.progressLabel")}
        >
          <div className="counter-bar-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </aside>
  );
}
