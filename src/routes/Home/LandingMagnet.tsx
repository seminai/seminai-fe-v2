import { useTranslation } from "react-i18next";
import { LANDING_LOGO, LANDING_LOGO_SRCSET } from "./constants";
import { RichHtml } from "./RichHtml";

interface LandingMagnetProps {
  onOpenSendInvoices: () => void;
}

interface InvoiceLine {
  label: string;
  amount: string;
}

export function LandingMagnet({ onOpenSendInvoices }: LandingMagnetProps) {
  const { t } = useTranslation();
  const invoiceLines = t("landing.magnet.invoiceLines", {
    returnObjects: true,
  }) as InvoiceLine[];

  return (
    <section className="magnet" id="trial">
      <div className="container">
        <div className="magnet-grid">
          <div>
            <h2>
              <RichHtml html={t("landing.magnet.title")} />
            </h2>
            <div className="magnet-cta">
              <button type="button" className="btn-primary" onClick={onOpenSendInvoices}>
                {t("landing.magnet.cta")}
                <span className="arrow" />
              </button>
              <span className="note">{t("landing.magnet.note")}</span>
            </div>
          </div>

          <div
            className="magnet-visual"
            role="img"
            aria-label={t("landing.magnet.chatAria")}
          >
            <div className="chat-mock">
              <div className="chat-head">
                <div className="chat-avatar" aria-hidden="true">
                  <img
                    src={LANDING_LOGO}
                    srcSet={LANDING_LOGO_SRCSET}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={24}
                    height={24}
                  />
                </div>
                <div className="chat-status">{t("landing.magnet.chatStatus")}</div>
              </div>
              <div className="chat-body">
                <div className="chat-date">{t("landing.magnet.chatDate")}</div>

                <div className="bubble out">
                  {t("landing.magnet.chatOut1")}
                  <div className="meta">
                    09:42 <span className="ticks">✓✓</span>
                  </div>
                </div>

                <div className="bubble out photo">
                  <div className="invoice" aria-hidden="true">
                    <div className="inv-top">
                      <div className="inv-brand">{t("landing.magnet.invoiceBrand")}</div>
                      <div className="inv-num">{t("landing.magnet.invoiceNum")}</div>
                    </div>
                    <div className="inv-title">{t("landing.magnet.invoiceTitle")}</div>
                    {invoiceLines.map((line) => (
                      <div key={line.label} className="inv-line">
                        <span>{line.label}</span>
                        <strong>{line.amount}</strong>
                      </div>
                    ))}
                    <div className="inv-total">
                      <span>Totale IVA inclusa</span>
                      <span>{t("landing.magnet.invoiceTotal")}</span>
                    </div>
                  </div>
                  <div className="photo-caption">{t("landing.magnet.photoCaption")}</div>
                  <div className="meta">
                    09:42 <span className="ticks">✓✓</span>
                  </div>
                </div>

                <div className="bubble in">
                  {t("landing.magnet.chatIn")}
                  <div className="meta">09:43</div>
                </div>

                <div className="typing" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="chat-foot" aria-hidden="true">
                <div className="chat-input">{t("landing.magnet.chatInput")}</div>
                <div className="chat-send">➤</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
