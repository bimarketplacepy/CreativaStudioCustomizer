import React, { Suspense, lazy, useEffect } from "react";
import DeferUntilVisible from "@/components/defer-until-visible";
import { hasSharedDesign } from "@/lib/design-link";
import { scrollToSection } from "@/lib/section-reveal";

// Everything below the hero is loaded on demand. The hero is the only
// above-the-fold section: it is pre-rendered into index.html and hydrated from
// its own root by main.tsx (it is NOT rendered here). The rest is split into
// separate chunks: the section right under the hero loads straight away, the
// ones further down (LazySection) and the heavy Three.js customizer only when
// the visitor scrolls near them.
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
      data-section-pending
      style={{ minHeight: minH }}
      className={label ? "w-full section-shimmer flex items-center justify-center" : "w-full"}
    >
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

/** Below-the-fold section: its chunk and render wait until it nears the
 *  viewport (or until in-page nav reveals it — lib/section-reveal.ts), so none
 *  of it competes with the initial load. The wrapper reserves `minH` so
 *  nothing jumps when it mounts. */
function LazySection({ minH, children }: { minH: string; children: React.ReactNode }) {
  return (
    <DeferUntilVisible minHeight={minH} revealable>
      <Suspense fallback={<SectionFallback minH={minH} />}>{children}</Suspense>
    </DeferUntilVisible>
  );
}

export default function Home() {
  // Link de diseño compartido (#diseno=…): bajar directo al personalizador. El
  // scroll dispara la carga diferida y el Customizer aplica el diseño al montar.
  useEffect(() => {
    if (!hasSharedDesign()) return;
    const t = setTimeout(() => document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth" }), 300);
    return () => clearTimeout(t);
  }, []);

  // Deep link a una sección (#precios, #stickers…): las secciones bajo el fold
  // se montan diferidas, así que el salto nativo del navegador no encuentra el
  // id al cargar. scrollToSection las monta y scrollea cuando el id existe.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (/^[a-z-]+$/.test(id)) scrollToSection(id);
  }, []);

  return (
    // Sin wrapper propio: el contenedor flex de página vive en index.html
    // (envuelve #hero-root y #root, ambos display:contents).
    <>
      <Suspense fallback={<SectionFallback minH="70vh" />}>
        <FunnelDemo />
      </Suspense>
      <DeferUntilVisible id="customizer" minHeight="90vh">
        <Suspense fallback={<SectionFallback minH="90vh" label="Cargando personalizador…" />}>
          <Customizer />
        </Suspense>
      </DeferUntilVisible>
      <LazySection minH="40vh">
        <PersonalizationInfo />
      </LazySection>
      <LazySection minH="40vh">
        <CustomRequests />
      </LazySection>
      <LazySection minH="60vh">
        <PricingEngraving />
      </LazySection>
      <LazySection minH="60vh">
        <Gallery />
      </LazySection>
      <LazySection minH="30vh">
        <Footer />
      </LazySection>
      <Suspense fallback={null}>
        <WhatsAppButton />
      </Suspense>
      <Suspense fallback={null}>
        <CustomizerTutorial />
      </Suspense>
    </>
  );
}
