/**
 * Diseños de ejemplo de los stickers: los usa la herramienta (stickers.tsx,
 * «O probá con un ejemplo») y la sección de la landing (stickers-promo.tsx).
 * Archivo aparte y sin dependencias, para que la sección no cargue la
 * herramienta entera.
 */
export const EXAMPLES: { id: string; label: string; svg: string }[] = [
  {
    id: "logo",
    label: "Logo",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
      <circle cx="600" cy="600" r="560" fill="#8B1A2F"/>
      <circle cx="600" cy="600" r="490" fill="none" stroke="#f3e6d3" stroke-width="18"/>
      <text x="600" y="700" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="330" font-weight="700" fill="#f3e6d3">CS</text>
      <text x="600" y="860" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="78" letter-spacing="18" font-weight="700" fill="#f3e6d3">CREATIVA</text>
      <path d="M430 380 L600 300 L770 380" fill="none" stroke="#f3e6d3" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    id: "mascota",
    label: "Mascota",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
      <path d="M250 520 L300 150 L520 360 Z" fill="#e8913a" stroke="#3b2516" stroke-width="28" stroke-linejoin="round"/>
      <path d="M950 520 L900 150 L680 360 Z" fill="#e8913a" stroke="#3b2516" stroke-width="28" stroke-linejoin="round"/>
      <path d="M320 470 L330 260 L450 380 Z" fill="#f6c6a8"/>
      <path d="M880 470 L870 260 L750 380 Z" fill="#f6c6a8"/>
      <ellipse cx="600" cy="680" rx="430" ry="380" fill="#e8913a" stroke="#3b2516" stroke-width="28"/>
      <ellipse cx="600" cy="800" rx="230" ry="170" fill="#fbe7d3"/>
      <ellipse cx="440" cy="620" rx="62" ry="80" fill="#3b2516"/>
      <ellipse cx="760" cy="620" rx="62" ry="80" fill="#3b2516"/>
      <circle cx="460" cy="590" r="20" fill="#fff"/>
      <circle cx="780" cy="590" r="20" fill="#fff"/>
      <path d="M560 730 L640 730 L600 780 Z" fill="#d9536b" stroke="#3b2516" stroke-width="14" stroke-linejoin="round"/>
      <path d="M600 780 Q600 840 540 850 M600 780 Q600 840 660 850" fill="none" stroke="#3b2516" stroke-width="14" stroke-linecap="round"/>
      <path d="M380 760 L210 730 M380 800 L210 820 M820 760 L990 730 M820 800 L990 820" stroke="#3b2516" stroke-width="12" stroke-linecap="round"/>
      <ellipse cx="360" cy="760" rx="50" ry="28" fill="#f29aa8" opacity="0.7"/>
      <ellipse cx="840" cy="760" rx="50" ry="28" fill="#f29aa8" opacity="0.7"/>
    </svg>`,
  },
  {
    id: "frase",
    label: "Frase",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="760" viewBox="0 0 1400 760">
      <g font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif" font-weight="900" text-anchor="middle" stroke="#1d3b3a" stroke-width="34" stroke-linejoin="round" paint-order="stroke">
        <text x="700" y="330" font-size="270" fill="#f2c94c">MATE</text>
        <text x="700" y="640" font-size="270" fill="#56c2a6">Y VOS</text>
      </g>
      <path d="M1180 120 l26 54 58 8 -42 40 10 58 -52 -28 -52 28 10 -58 -42 -40 58 -8 z" fill="#ef6f6c" stroke="#1d3b3a" stroke-width="16" stroke-linejoin="round"/>
    </svg>`,
  },
];

export const exampleUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
