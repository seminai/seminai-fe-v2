import type { ReactNode } from "react";
import "./landing.css";
import { LandingFooter } from "./LandingFooter";
import { LandingNav } from "./LandingNav";

type LegalPageLayoutProps = {
  children: ReactNode;
};

export function LegalPageLayout({ children }: LegalPageLayoutProps) {
  return (
    <div className="landing-page wrap legal-page">
      <LandingNav />
      <main className="legal-content container">{children}</main>
      <LandingFooter />
    </div>
  );
}
