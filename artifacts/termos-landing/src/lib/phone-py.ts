/**
 * Copia del normalizador del api-server (artifacts/api-server/src/lib/phone-py.ts)
 * para validar en el navegador antes de llamar a la API. Si cambia uno, cambia
 * el otro: la regla manda en el servidor.
 */
const PY_MOBILE_RE = /^\+5959\d{8}$/;

/** `+5959XXXXXXXX` o `null` si no es un celular paraguayo válido. */
export function normalizePhonePy(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.trim();
  if (!s) return null;
  s = s.replace(/\(\s*0\s*\)/g, "");
  const plus = s.startsWith("+");
  let digits = s.replace(/\D/g, "");
  if (!digits) return null;
  if (!plus && digits.startsWith("00")) digits = digits.slice(2);
  if (!plus && !digits.startsWith("595") && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("595")) digits = digits.slice(3);
  if (digits.length === 10 && digits.startsWith("09")) digits = digits.slice(1);
  const out = `+595${digits}`;
  return PY_MOBILE_RE.test(out) ? out : null;
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s : null;
}
