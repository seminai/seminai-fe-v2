import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SendInvoicesEmailDialog } from "@/components/organism/SendInvoicesEmailDialog";

export function LandingEmailFallback() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <section className="email-fallback">
        <div className="container">
          <p className="email-fallback-text">
            {t("landing.emailFallback.teaser")}{" "}
            <button
              type="button"
              className="email-fallback-link"
              onClick={() => setDialogOpen(true)}
            >
              {t("landing.emailFallback.teaserLink")}
            </button>
          </p>
        </div>
      </section>

      <SendInvoicesEmailDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
