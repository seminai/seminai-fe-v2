import type { ReactNode } from "react";
import { LandingFooter } from "./LandingFooter";
import { LandingNav } from "./LandingNav";
import "./landing.css";

type LegalPageLayoutProps = {
  children: ReactNode;
};

export function LegalPageLayout({ children }: LegalPageLayoutProps) {
  return (
    <div className="landing-page wrap legal-page">
      <LandingNav />
      <main id="contenuto" className="legal-content container">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
