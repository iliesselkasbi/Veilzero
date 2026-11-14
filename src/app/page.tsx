import Hero from "@/components/landing/Hero";
import ModeCards from "@/components/landing/ModeCards";
import TrustBadges from "@/components/landing/TrustBadges";
import HowItWorks from "@/components/about/HowItWorks";

export default function Home() {
  return (
    <>
      <Hero />
      <ModeCards />
      <TrustBadges />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <HowItWorks />
      </section>
    </>
  );
}
