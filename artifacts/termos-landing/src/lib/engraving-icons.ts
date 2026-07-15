export interface EngravingIcon {
  id: string;
  name: string;
  /** Inner SVG markup drawn in a 0 0 24 24 viewBox, using `currentColor`. */
  body: string;
}

/**
 * A small curated set of engravable icons. Each is a solid (or thick-stroked)
 * silhouette so the laser engrave-mask reads it as a clean cut-out shape, and
 * so it previews sharply at small sizes in the picker.
 */
export const ENGRAVING_ICONS: EngravingIcon[] = [
  { id: "heart",    name: "Corazón",  body: `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>` },
  { id: "star",     name: "Estrella", body: `<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>` },
  { id: "flower",   name: "Flor",     body: `<g fill="currentColor"><circle cx="12" cy="6" r="3"/><circle cx="17.7" cy="10.1" r="3"/><circle cx="15.5" cy="16.9" r="3"/><circle cx="8.5" cy="16.9" r="3"/><circle cx="6.3" cy="10.1" r="3"/><circle cx="12" cy="12" r="2.6"/></g>` },
  { id: "paw",      name: "Huella",   body: `<g fill="currentColor"><circle cx="6" cy="9.5" r="2.1"/><circle cx="10" cy="6.5" r="2.1"/><circle cx="14" cy="6.5" r="2.1"/><circle cx="18" cy="9.5" r="2.1"/><ellipse cx="12" cy="15.5" rx="4.6" ry="3.9"/></g>` },
  { id: "crown",    name: "Corona",   body: `<path d="M3 8l3.5 3.5L12 4l5.5 7.5L21 8l-1.7 11H4.7z" fill="currentColor"/>` },
  { id: "music",    name: "Música",   body: `<g fill="currentColor"><circle cx="8" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><rect x="10.4" y="4" width="2.2" height="14"/><rect x="19.3" y="4" width="2.2" height="12"/><path d="M10.4 4L21.5 6V9L10.4 7z"/></g>` },
  { id: "ball",     name: "Pelota",   body: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="12,8 15.3,10.4 14,14.3 10,14.3 8.7,10.4" fill="currentColor"/>` },
  { id: "mate",     name: "Mate",     body: `<g fill="currentColor"><path d="M5.5 8h9v6.2A3.8 3.8 0 0 1 10.7 18H9.3A3.8 3.8 0 0 1 5.5 14.2z"/><rect x="6" y="4" width="8" height="2" rx="1"/></g><path d="M14.5 9.5h2.2a2.4 2.4 0 0 1 0 4.8h-1.7" fill="none" stroke="currentColor" stroke-width="2"/>` },
  { id: "anchor",   name: "Ancla",    body: `<g fill="currentColor"><rect x="11" y="7" width="2" height="12"/><rect x="8.5" y="9" width="7" height="2"/></g><circle cx="12" cy="5" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 13a8 8 0 0 0 16 0" fill="none" stroke="currentColor" stroke-width="2"/>` },
  { id: "mountain", name: "Montaña",  body: `<path d="M2 20L9 7l3.5 6.2L15 9l7 11z" fill="currentColor"/>` },
  { id: "bolt",     name: "Rayo",     body: `<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/>` },
  { id: "diamond",  name: "Diamante", body: `<path d="M6 3h12l3 5-9 13L3 8z" fill="currentColor"/>` },
];

/**
 * A black-on-transparent SVG data URL for the chosen icon, sized so the
 * engrave-mask has enough resolution to bevel cleanly. Fed through the exact
 * same custom-art path as an uploaded logo.
 */
export function iconToDataUrl(icon: EngravingIcon): string {
  const body = icon.body.replace(/currentColor/g, "#000000");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24">${body}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
