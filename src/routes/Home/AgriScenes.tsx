import { useTranslation } from "react-i18next";
import {
  CursorWalkthrough,
  type CursorStep,
} from "./walkthrough/CursorWalkthrough";

interface InvoiceRow {
  date: string;
  product: string;
  field: string;
  dose: string;
  status: string;
  tone: string;
}

interface InvoiceWalkthroughProps {
  readonly paused?: boolean;
  readonly onCycleComplete?: () => void;
}

const INVOICE_STEPS: readonly CursorStep[] = [
  { x: 88, y: 14 },
  { x: 88, y: 14, click: true },
  { x: 46, y: 62 },
  { x: 30, y: 86 },
];

const CHAT_STEPS: readonly CursorStep[] = [
  { x: 46, y: 78 },
  { x: 46, y: 78 },
  { x: 88, y: 78, click: true },
  { x: 34, y: 28 },
];

export function InvoiceWalkthrough({ paused = false, onCycleComplete }: InvoiceWalkthroughProps) {
  const { t } = useTranslation();
  const rows = t("landing.show.invoice.rows", { returnObjects: true }) as InvoiceRow[];
  const added = t("landing.show.invoice.added", { returnObjects: true }) as InvoiceRow;
  const headers = t("landing.show.invoice.headers", { returnObjects: true }) as string[];
  const nav = t("landing.show.invoice.nav", { returnObjects: true }) as string[];
  const navActive = t("landing.show.invoice.navActive");

  return (
    <CursorWalkthrough
      steps={INVOICE_STEPS}
      url={t("landing.show.invoice.url")}
      caption={t("landing.show.invoice.caption")}
      stageClassName="is-app"
      paused={paused}
      onCycleComplete={onCycleComplete}
    >
      {(step) => (
        <div className="app-frame">
          <aside className="app-rail" aria-hidden="true">
            {nav.map((item) => (
              <span key={item} className={`app-nav${item === navActive ? " is-active" : ""}`}>
                <span className="app-nav-mark" />
                {item}
              </span>
            ))}
          </aside>
          <div className="app-main">
            <div className="app-tabbar">
              <span className="app-tab is-active">{t("landing.show.invoice.tab")}</span>
            </div>
            <div className="scene-toolbar app-toolbar">
              <div className="demo-h">{t("landing.show.invoice.title")}</div>
              <span className={`scene-btn${step >= 2 ? " is-idle" : ""}`}>
                {t("landing.show.invoice.upload")}
              </span>
            </div>
            <div className="demo-table">
              <div className="demo-row demo-hd cols-5">
                {headers.map((header) => (
                  <span key={header}>{header}</span>
                ))}
              </div>
              {rows.map((row) => (
                <InvoiceLine key={row.product} row={row} />
              ))}
              {step >= 2 ? <InvoiceLine row={added} isNew /> : null}
            </div>
            {step >= 3 ? (
              <div className="demo-note">
                <span className="note-dot" />
                <span>{t("landing.show.invoice.note")}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </CursorWalkthrough>
  );
}

function InvoiceLine({ row, isNew = false }: { row: InvoiceRow; isNew?: boolean }) {
  const tone = row.tone === "warn" ? "warn" : "ok";
  return (
    <div className={`demo-row cols-5${isNew ? " is-new" : ""}`}>
      <span>{row.date}</span>
      <span>{row.product}</span>
      <span>{row.field}</span>
      <span>{row.dose}</span>
      <span className={`tag ${tone}`}>{row.status}</span>
    </div>
  );
}

export function ChatWalkthrough() {
  const { t } = useTranslation();
  const fixed = t("landing.show.chat.fixed");

  return (
    <CursorWalkthrough
      steps={CHAT_STEPS}
      url={t("landing.show.chat.url")}
      caption={t("landing.show.chat.caption")}
    >
      {(step) => (
        <>
          <div className="demo-eyebrow">{t("landing.show.chat.eyebrow")}</div>
          <div className="demo-row demo-hd cols-3">
            <span>{t("landing.show.chat.date")}</span>
            <span>{t("landing.show.chat.product")}</span>
            <span>{t("landing.show.chat.dose")}</span>
          </div>
          <div className={`demo-row cols-3${step < 3 ? " warn" : ""}`}>
            <span>24 Mar</span>
            <span>Mancozeb 75</span>
            <span>{step >= 3 ? fixed : t("landing.show.chat.original")}</span>
          </div>
          <div className="scene-chat">
            {step >= 2 ? (
              <div className="scene-bubble">{t("landing.show.chat.prompt")}</div>
            ) : null}
            {step >= 3 ? (
              <div className="scene-bubble in">{t("landing.show.chat.reply")}</div>
            ) : null}
            <div className={`scene-input${step === 1 ? " is-filled" : ""}`}>
              {step === 1 ? t("landing.show.chat.prompt") : t("landing.show.chat.placeholder")}
            </div>
          </div>
        </>
      )}
    </CursorWalkthrough>
  );
}
