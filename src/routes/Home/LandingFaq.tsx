import { useTranslation } from "react-i18next";

interface FaqItem {
  question: string;
  answer: string;
}

interface LandingFaqProps {
  readonly titleKey?: string;
  readonly itemsKey?: string;
}

export function LandingFaq({
  titleKey = "landing.faq.title",
  itemsKey = "landing.faq.items",
}: LandingFaqProps) {
  const { t } = useTranslation();
  const items = t(itemsKey, {
    returnObjects: true,
  }) as FaqItem[];

  return (
    <section className="row faq" id="faq">
      <div className="container">
        <div className="faq-grid">
          <div>
            <h2>{t(titleKey)}</h2>
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
