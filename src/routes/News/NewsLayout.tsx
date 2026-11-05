import type { ReactNode } from "react";
import type { SupportedLanguage } from "@/i18n";
import { LandingFooter } from "../Home/LandingFooter";
import { LandingNav } from "../Home/LandingNav";

type NewsLayoutProps = {
  /** Where the IT / EN switch leads: the article's translation or the news index. */
  languageLinks: Record<SupportedLanguage, string>;
  children: ReactNode;
};

export function NewsLayout({ languageLinks, children }: NewsLayoutProps) {
  return (
    <div className="landing-page wrap news-page">
      <LandingNav languageLinks={languageLinks} />
      <main id="contenuto">{children}</main>
      <LandingFooter />
    </div>
  );
}
