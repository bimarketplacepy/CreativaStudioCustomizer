import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "./logger";

/**
 * Clave de acceso interno (panel /admin y archivo de producción).
 * Por pedido del negocio la contraseña por defecto es "creativa123";
 * definir INTERNAL_ACCESS_KEY en los Secrets la reemplaza sin tocar código.
 * IMPORTANTE: el panel muestra datos de clientes (nombres, fotos): en
 * producción conviene definir el Secret con una clave larga.
 */
const INTERNAL_KEY = process.env.INTERNAL_ACCESS_KEY || "creativa123";
if (!process.env.INTERNAL_ACCESS_KEY) {
  logger.warn("INTERNAL_ACCESS_KEY no definido: el panel /admin usa la clave por defecto");
}

/** Comparación en tiempo constante (no filtra la clave por timing). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkInternalKey(got: unknown): boolean {
  return typeof got === "string" && got.length > 0 && safeEqual(got, INTERNAL_KEY);
}

/**
 * Token no adivinable para la URL pública de la imagen de un pedido. Los
 * números de pedido son correlativos (CS-0001, CS-0002…): sin el token
 * cualquiera podría recorrerlos y ver los diseños (nombres, fotos) de otros
 * clientes. HMAC del número con un secreto del server: no hace falta guardarlo.
 */
const LINK_SECRET = process.env.ORDER_LINK_SECRET || `order-link:${INTERNAL_KEY}`;

export function orderImageToken(orderNumber: string): string {
  return createHmac("sha256", LINK_SECRET).update(orderNumber).digest("hex").slice(0, 24);
}

export function checkOrderImageToken(orderNumber: string, got: unknown): boolean {
  return typeof got === "string" && safeEqual(got, orderImageToken(orderNumber));
}
