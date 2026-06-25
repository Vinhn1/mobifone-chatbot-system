import { HeroSection } from "../components/HeroSection";
import { FeatureCards } from "../components/FeatureCards";
import { PricingSection } from "../components/PricingSection";

export function HomePage() {
  return (
    <>
      <HeroSection />
      <FeatureCards />
      <PricingSection />
    </>
  );
}
