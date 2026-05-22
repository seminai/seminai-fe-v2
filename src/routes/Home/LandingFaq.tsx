import { useTranslation } from "react-i18next";

interface FaqItem {
  question: string;
  answer: string;
}

export function LandingFaq() {
  const { t } = useTranslation();
  const items = t("landing.faq.items", {
    returnObjects: true,
  }) as FaqItem[];

  return (
    <section className="row faq" id="faq" style={{ padding: "50px 0px 90px" }}>
      <div className="container">
        <div className="faq-grid">
          <div>
            <h2>{t("landing.faq.title")}</h2>
          </div>

          <div className="faq-list">
            {items.map((item, index) => (
              <details key={item.question} className="q" open={index === 0}>
                <summary>
                  {item.question}
                  <span className="plus" />
                </summary>
                <div className="answer">{item.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
