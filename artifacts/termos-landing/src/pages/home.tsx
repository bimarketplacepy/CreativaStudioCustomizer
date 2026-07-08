import React, { useState } from "react";
import Hero from "@/components/hero";
import Customizer from "@/components/customizer";
import Features from "@/components/features";
import PricingEngraving from "@/components/pricing-engraving";
import Gallery from "@/components/gallery";
import Footer from "@/components/footer";
import WhatsAppButton from "@/components/whatsapp-button";

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col overflow-x-hidden">
      <Hero />
      <Features />
      <Customizer />
      <PricingEngraving />
      <Gallery />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
