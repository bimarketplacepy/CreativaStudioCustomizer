import React, { Suspense, lazy } from "react";
import Hero from "@/components/hero";
import DeferUntilVisible from "@/components/defer-until-visible";

// Everything below the hero is loaded on demand. The hero is the only
// above-the-fold section, so it stays in the initial bundle; the rest —
// including the heavy Three.js customizer (~600 KB) — is split into separate
// chunks that download while the visitor reads the hero.
const FunnelDemo = lazy(() => import("@/components/funnel-demo"));
const PersonalizationInfo = lazy(() => import("@/components/personalization-info"));
const Customizer = lazy(() => import("@/components/customizer"));
const CustomRequests = lazy(() => import("@/components/custom-requests"));
const PricingEngraving = lazy(() => import("@/components/pricing-engraving"));
const Gallery = lazy(() => import("@/components/gallery"));
const Footer = lazy(() => import("@/components/footer"));
const WhatsAppButton = lazy(() => import("@/components/whatsapp-button"));
// First-visit onboarding modal: plays a mini demo of the customizer when the
// #customizer section scrolls into view. Independent overlay — touches nothing.
const CustomizerTutorial = lazy(() => import("@/components/customizer-tutorial"));

/** Minimal placeholder while a lazy section streams in — reserves vertical
 *  space so nothing jumps (keeps CLS at 0). With `label`, shows a subtle
 *  shimmer + text instead of a blank block (used by the heavy customizer). */
function SectionFallback({ minH = "60vh", label }: { minH?: string; label?: string }) {
  return (
    <div
      aria-hidden
      style={{ minHeight: minH }}
      className={label ? "w-full section-shimmer flex items-center justify-center" : "w-full"}
    >
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col overflow-x-hidden">
      <Hero />
      <Suspense fallback={<SectionFallback minH="70vh" />}>
        <FunnelDemo />
      </Suspense>
      <DeferUntilVisible id="customizer" minHeight="90vh">
        <Suspense fallback={<SectionFallback minH="90vh" label="Cargando personalizador…" />}>
          <Customizer />
        </Suspense>
      </DeferUntilVisible>
      <Suspense fallback={<SectionFallback minH="40vh" />}>
        <PersonalizationInfo />
      </Suspense>
      <Suspense fallback={<SectionFallback minH="40vh" />}>
        <CustomRequests />
      </Suspense>
      <Suspense fallback={<SectionFallback minH="60vh" />}>
        <PricingEngraving />
      </Suspense>
      <Suspense fallback={<SectionFallback minH="60vh" />}>
        <Gallery />
      </Suspense>
      <Suspense fallback={<SectionFallback minH="30vh" />}>
        <Footer />
      </Suspense>
      <Suspense fallback={null}>
        <WhatsAppButton />
      </Suspense>
      <Suspense fallback={null}>
        <CustomizerTutorial />
      </Suspense>
    </div>
  );
}
