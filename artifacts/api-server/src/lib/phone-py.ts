/**
 * Normalización de celulares de Paraguay al formato internacional
 * `+5959XXXXXXXX` (+595 + 9 dígitos que empiezan con 9).
 *
 * Se usa ANTES de buscar o crear el contacto en Odoo, para que
 * "0981 123-456", "+595 (0)981 123456" y "595981123456" sean el mismo
 * número. Lo que no quede como celular paraguayo válido se considera
 * inválido y no se manda a Odoo.
 */

/** Celular paraguayo normalizado: +595 y 9 dígitos que empiezan con 9. */
const PY_MOBILE_RE = /^\+5959\d{8}$/;

/**
 * Devuelve el número en formato `+5959XXXXXXXX` o `null` si no es un celular
 * paraguayo válido. Acepta espacios, guiones, paréntesis, puntos, el `(0)`
 * de troncal y el prefijo `00` internacional.
 */
export function normalizePhonePy(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.trim();
  if (!s) return null;
  // "(0)" de troncal entre el código de país y el número: +595 (0)981… → +595 981…
  s = s.replace(/\(\s*0\s*\)/g, "");
  // Solo dígitos y el "+" inicial.
  const plus = s.startsWith("+");
  let digits = s.replace(/\D/g, "");
  if (!digits) return null;
  // 00 internacional → como si fuera "+".
  if (!plus && digits.startsWith("00")) digits = digits.slice(2);
  // 0981… → 981… (troncal nacional)
  if (!plus && !digits.startsWith("595") && digits.startsWith("0")) digits = digits.slice(1);
  // 595981… → 981…
  if (digits.startsWith("595")) digits = digits.slice(3);
  // Un número nacional con el "0" después del 595: 5950981… → 981…
  if (digits.length === 10 && digits.startsWith("09")) digits = digits.slice(1);
  const out = `+595${digits}`;
  return PY_MOBILE_RE.test(out) ? out : null;
}

/** Últimos 9 dígitos (9XXXXXXXX) de un número normalizado. */
export function phoneSearchKey(normalized: string): string {
  return normalized.slice(-9);
}

/**
 * Patrón `ilike` para encontrar ese número en Odoo aunque esté guardado con
 * espacios, guiones o puntos ("0982 555-444", "+595 982 555 444"): los 9
 * dígitos con `%` entre medio. Es amplio a propósito; el cruce exacto lo
 * hace la API normalizando lo que devuelve Odoo.
 */
export function phoneSearchPattern(normalized: string): string {
  return phoneSearchKey(normalized).split("").join("%");
}

/** Email en minúsculas y sin espacios; `null` si no tiene forma de email. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s : null;
}
