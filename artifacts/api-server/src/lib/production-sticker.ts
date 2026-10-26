// Archivos de producción en PNG: STICKERS (eufyMake E1) y el desenrollado de
// la Dacen F5 (RIPrint), que también se imprime desde un PNG transparente.
//
// En la eufyMake E1 el operario descarga una imagen y la coloca sobre la
// lámina adhesiva en la app de la impresora (eufyMake Studio). El formato que
// mejor anda ahí es PNG con fondo transparente: lo transparente no se imprime
// y el sticker sale con su forma. La landing ya arma el PNG a tamaño real
// (borde blanco + arte); acá se valida y se le graban los dpi (chunk pHYs)
// para que la app lo importe con su medida real.

import { crc32 } from "node:zlib";

/** Tope del PNG decodificado (el JSON del pedido admite 6 MB en base64). */
const MAX_PNG_BYTES = 4.5 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}

/**
 * PNG listo para la app de la máquina (eufyMake Studio / RIPrint), o null si
 * el data URL no es un PNG válido. `dpi` (si viene) se graba en el archivo
 * para que se importe con su medida real; sin dpi queda como está.
 */
export function productionPng(dataUrl: string | null | undefined, dpi: unknown): Buffer | null {
  const m = dataUrl?.match(/^data:image\/png;base64,(.+)$/);
  if (!m) return null;
  const png = Buffer.from(m[1]!, "base64");
  if (png.length > MAX_PNG_BYTES || png.length < 33 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  // El primer chunk de un PNG es siempre IHDR (8 + 13 + 4 = 25 bytes).
  if (png.toString("ascii", 12, 16) !== "IHDR") return null;
  if (typeof dpi !== "number" || !Number.isFinite(dpi) || dpi < 50 || dpi > 1200) return png;

  // pHYs: píxeles por metro en X e Y, unidad 1 = metro. Va justo después de IHDR
  // (el canvas del navegador no escribe uno propio).
  const ppm = Math.round(dpi / 0.0254);
  const phys = Buffer.alloc(9);
  phys.writeUInt32BE(ppm, 0);
  phys.writeUInt32BE(ppm, 4);
  phys.writeUInt8(1, 8);
  const ihdrEnd = 8 + 25;
  return Buffer.concat([png.subarray(0, ihdrEnd), chunk("pHYs", phys), png.subarray(ihdrEnd)]);
}

/** Tope del JPEG del fondo 360° de la Dacen (la landing apunta a ≤ 5,5 MB). */
const MAX_JPEG_BYTES = 6 * 1024 * 1024;

/**
 * JPEG de la Dacen con fondo "Todo el vaso (360°)" (DACEN.md §12.6): la banda
 * va llena, así que no hay transparencia que perder y una foto entra a 300 dpi.
 * Se valida y se graban los dpi en el encabezado JFIF (el canvas del navegador
 * escribe densidad 1:1 sin unidad), para que RIPrint lo abra a tamaño real.
 */
export function productionJpeg(dataUrl: string | null | undefined, dpi: unknown): Buffer | null {
  const m = dataUrl?.match(/^data:image\/jpeg;base64,(.+)$/);
  if (!m) return null;
  const jpg = Buffer.from(m[1]!, "base64");
  if (jpg.length > MAX_JPEG_BYTES || jpg.length < 20 || jpg[0] !== 0xff || jpg[1] !== 0xd8) return null;
  if (typeof dpi !== "number" || !Number.isFinite(dpi) || dpi < 50 || dpi > 1200) return jpg;
  // SOI + APP0 "JFIF\0": unidad en el byte 13 (1 = dpi), densidades X/Y en 14 y 16.
  const out = Buffer.from(jpg);
  if (out[2] === 0xff && out[3] === 0xe0 && out.toString("ascii", 6, 11) === "JFIF\0") {
    out.writeUInt8(1, 13);
    out.writeUInt16BE(Math.round(dpi), 14);
    out.writeUInt16BE(Math.round(dpi), 16);
  }
  return out;
}

/**
 * Nombre de descarga: pedido, máquina, medida y cantidad, para ubicarlo rápido
 * en la app. Sticker: `CS-0012-sticker-50x50mm-x10.png`; Dacen:
 * `CS-0012-dacen-360-220x180mm.png` (ancho = la vuelta completa).
 */
export function productionPngFileName(orderNumber: string, machine: string, design: Record<string, unknown>, ext: "png" | "jpg" = "png"): string {
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
  if (machine === "dacen") {
    const w = n(design.printWidthMm);
    const h = n(design.printHeightMm);
    return [orderNumber, "dacen-360", w && h ? `${w}x${h}mm` : null].filter(Boolean).join("-") + "." + ext;
  }
  const w = n(design.widthMm);
  const h = n(design.heightMm);
  const q = n(design.quantity);
  return [orderNumber, "sticker", w && h ? `${w}x${h}mm` : null, q ? `x${q}` : null].filter(Boolean).join("-") + ".png";
}
