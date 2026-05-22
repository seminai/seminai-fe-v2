import "./landing.css";
import { LandingEmailFallback } from "./LandingEmailFallback";
import { LandingFaq } from "./LandingFaq";
import { LandingFooter } from "./LandingFooter";
import { LandingFork } from "./LandingFork";
import { LandingHero } from "./LandingHero";
import { LandingMagnet } from "./LandingMagnet";
import { LandingNav } from "./LandingNav";
import { LandingPricing } from "./LandingPricing";
import { LandingProblem } from "./LandingProblem";
import { LandingSolution } from "./LandingSolution";
import { LandingTrust } from "./LandingTrust";

export default function Home() {
  return (
    <div className="landing-page wrap">
      <LandingNav />
      <LandingHero />
      <LandingProblem />
      <LandingSolution />
      <LandingTrust />
      <LandingFork />
      <LandingPricing />
      <LandingMagnet />
      <LandingFaq />
      <LandingEmailFallback />
      <LandingFooter />
    </div>
  );
}
