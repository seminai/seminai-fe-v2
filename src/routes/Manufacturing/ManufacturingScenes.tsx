import { useTranslation } from "react-i18next";
import {
  CursorWalkthrough,
  type CursorStep,
} from "../Home/walkthrough/CursorWalkthrough";

interface DdtLine {
  label: string;
  value: string;
}

const DDT_STEPS: readonly CursorStep[] = [
  { x: 74, y: 16 },
  { x: 74, y: 16, click: true },
  { x: 40, y: 48 },
  { x: 40, y: 72 },
];

const LOAD_STEPS: readonly CursorStep[] = [
  { x: 72, y: 78 },
  { x: 72, y: 78, click: true },
  { x: 30, y: 46 },
  { x: 78, y: 18 },
];

const CHAT_STEPS: readonly CursorStep[] = [
  { x: 48, y: 78 },
  { x: 48, y: 78 },
  { x: 86, y: 78, click: true },
  { x: 36, y: 40 },
];

export function DdtWalkthrough() {
  const { t } = useTranslation();
  const lines = t("landing.manufacturing.ddt.lines", { returnObjects: true }) as DdtLine[];

  return (
    <CursorWalkthrough
      steps={DDT_STEPS}
      url={t("landing.manufacturing.ddt.url")}
      caption={t("landing.manufacturing.ddt.caption")}
    >
      {(step) => (
        <>
          <div className="scene-toolbar">
            <div>
              <div className="demo-eyebrow">{t("landing.manufacturing.ddt.eyebrow")}</div>
              <div className="demo-h">{t("landing.manufacturing.ddt.title")}</div>
            </div>
            <span className={`scene-btn${step >= 2 ? " is-idle" : ""}`}>
              {t("landing.manufacturing.ddt.read")}
            </span>
          </div>
          {lines.map((line, index) => {
            const filled = step >= 3 || (step >= 2 && index === 0);
            return (
              <div key={line.label} className="mfg-field">
                <span>{line.label}</span>
                <strong>{filled ? line.value : "—"}</strong>
              </div>
            );
          })}
        </>
      )}
    </CursorWalkthrough>
  );
}

export function LoadWalkthrough() {
  const { t } = useTranslation();
  const accepted = t("landing.manufacturing.load.accepted");

  return (
    <CursorWalkthrough
      steps={LOAD_STEPS}
      url={t("landing.manufacturing.load.url")}
      caption={t("landing.manufacturing.load.caption")}
    >
      {(step) => (
        <>
          <div className="scene-toolbar">
            <div>
              <div className="demo-eyebrow">{t("landing.manufacturing.load.eyebrow")}</div>
              <div className="demo-h">{t("landing.manufacturing.load.title")}</div>
            </div>
            <span className={`tag${step >= 2 ? " ok" : " warn"}`}>
              {step >= 2 ? accepted : t("landing.manufacturing.load.pending")}
            </span>
          </div>
          <div className="mfg-field">
            <span>{t("landing.manufacturing.load.item")}</span>
            <strong>{t("landing.manufacturing.load.qty")}</strong>
          </div>
          <div className="mfg-field">
            <span>{t("landing.manufacturing.load.stockLabel")}</span>
            <strong>
              {step >= 2
                ? t("landing.manufacturing.load.stockAfter")
                : t("landing.manufacturing.load.stockBefore")}
            </strong>
          </div>
          <div className="scene-toolbar scene-toolbar-end">
            <span className={`scene-btn${step >= 2 ? " is-idle" : ""}`}>
              {t("landing.manufacturing.load.accept")}
            </span>
          </div>
        </>
      )}
    </CursorWalkthrough>
  );
}

export function WarehouseChatWalkthrough() {
  const { t } = useTranslation();

  return (
    <CursorWalkthrough
      steps={CHAT_STEPS}
      url={t("landing.manufacturing.chat.url")}
      caption={t("landing.manufacturing.chat.caption")}
    >
      {(step) => (
        <>
          <div className="demo-eyebrow">{t("landing.manufacturing.chat.eyebrow")}</div>
          <div className="demo-h">{t("landing.manufacturing.chat.title")}</div>
          <div className="mfg-field">
            <span>{t("landing.manufacturing.chat.warehouseA")}</span>
            <strong>
              {step >= 3
                ? t("landing.manufacturing.chat.stockAAfter")
                : t("landing.manufacturing.chat.stockABefore")}
            </strong>
          </div>
          <div className="mfg-field">
            <span>{t("landing.manufacturing.chat.warehouseB")}</span>
            <strong>
              {step >= 3
                ? t("landing.manufacturing.chat.stockBAfter")
                : t("landing.manufacturing.chat.stockBBefore")}
            </strong>
          </div>
          <div className="scene-chat">
            {step >= 2 ? (
              <div className="scene-bubble">{t("landing.manufacturing.chat.prompt")}</div>
            ) : null}
            {step >= 3 ? (
              <div className="scene-bubble in">{t("landing.manufacturing.chat.reply")}</div>
            ) : null}
            <div className={`scene-input${step === 1 ? " is-filled" : ""}`}>
              {step === 1
                ? t("landing.manufacturing.chat.prompt")
                : t("landing.manufacturing.chat.placeholder")}
            </div>
          </div>
        </>
      )}
    </CursorWalkthrough>
  );
}
