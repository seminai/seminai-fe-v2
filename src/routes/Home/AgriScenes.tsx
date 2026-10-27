import { useTranslation } from "react-i18next";
import {
  CursorWalkthrough,
  type CursorStep,
} from "./walkthrough/CursorWalkthrough";

interface InvoiceRow {
  date: string;
  product: string;
  dose: string;
}

interface PlanRow {
  date: string;
  place: string;
  product: string;
}

const INVOICE_STEPS: readonly CursorStep[] = [
  { x: 78, y: 12 },
  { x: 78, y: 12, click: true },
  { x: 28, y: 58 },
  { x: 18, y: 86 },
];

const PLAN_STEPS: readonly CursorStep[] = [
  { x: 12, y: 42 },
  { x: 12, y: 42, click: true },
  { x: 72, y: 86 },
  { x: 72, y: 86, click: true },
];

const CHAT_STEPS: readonly CursorStep[] = [
  { x: 46, y: 78 },
  { x: 46, y: 78 },
  { x: 88, y: 78, click: true },
  { x: 34, y: 28 },
];

export function InvoiceWalkthrough() {
  const { t } = useTranslation();
  const rows = t("landing.show.invoice.rows", { returnObjects: true }) as InvoiceRow[];
  const headers = t("landing.show.invoice.headers", { returnObjects: true }) as string[];

  return (
    <CursorWalkthrough
      steps={INVOICE_STEPS}
      url={t("landing.show.invoice.url")}
      caption={t("landing.show.invoice.caption")}
    >
      {(step) => (
        <>
          <div className="scene-toolbar">
            <div>
              <div className="demo-eyebrow">{t("landing.show.invoice.eyebrow")}</div>
              <div className="demo-h">{t("landing.show.invoice.title")}</div>
            </div>
            <span className={`scene-btn${step >= 2 ? " is-idle" : ""}`}>
              {t("landing.show.invoice.upload")}
            </span>
          </div>
          {step < 2 ? (
            <p className="scene-empty">{t("landing.show.invoice.empty")}</p>
          ) : (
            <div className="demo-table">
              <div className="demo-row demo-hd cols-3">
                {headers.map((header) => (
                  <span key={header}>{header}</span>
                ))}
              </div>
              {rows.map((row) => (
                <div key={row.product} className="demo-row cols-3">
                  <span>{row.date}</span>
                  <span>{row.product}</span>
                  <span>{row.dose}</span>
                </div>
              ))}
            </div>
          )}
          {step >= 3 ? (
            <div className="demo-note">
              <span className="note-dot" />
              <span>{t("landing.show.invoice.note")}</span>
            </div>
          ) : null}
        </>
      )}
    </CursorWalkthrough>
  );
}

export function PlanWalkthrough() {
  const { t } = useTranslation();
  const rows = t("landing.show.plan.rows", { returnObjects: true }) as PlanRow[];

  return (
    <CursorWalkthrough
      steps={PLAN_STEPS}
      url={t("landing.show.plan.url")}
      caption={t("landing.show.plan.caption")}
    >
      {(step) => (
        <>
          <div className="demo-eyebrow">{t("landing.show.plan.eyebrow")}</div>
          <div className="demo-h">{t("landing.show.plan.title")}</div>
          <div className="scene-list">
            {rows.map((row, index) => {
              const checked = step >= 3 || (step >= 1 && index === 0);
              return (
                <div key={row.date} className="scene-line">
                  <span className={`scene-check${checked ? " on" : ""}`} />
                  <span>{row.date}</span>
                  <span>{row.place}</span>
                  <span>{row.product}</span>
                </div>
              );
            })}
          </div>
          <div className="scene-toolbar scene-toolbar-end">
            <span className={`scene-btn${step >= 3 ? " is-idle" : ""}`}>
              {step >= 3 ? t("landing.show.plan.confirmed") : t("landing.show.plan.confirm")}
            </span>
          </div>
        </>
      )}
    </CursorWalkthrough>
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
