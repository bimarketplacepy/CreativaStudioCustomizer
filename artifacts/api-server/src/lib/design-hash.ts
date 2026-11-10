/**
 * Huella de la versión aprobada de un diseño (PROMPT-ODOO-TIENDA §3,
 * inmutabilidad): SHA-256 del designState con las claves ordenadas, así el
 * mismo diseño da siempre el mismo hash sin importar el orden de los campos.
 * Se excluyen los datos internos que el servidor agrega o que no cambian lo
 * que se produce (requestId, marcas internas).
 */
import { createHash } from "node:crypto";

const IGNORED = new Set(["requestId", "_imageTokenRequired", "engravingEstimate"]);

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v as Record<string, unknown>)
        .filter(k => !IGNORED.has(k) && !k.startsWith("__"))
        .sort()
        .map(k => [k, canonical((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

export function designHash(designState: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonical(designState ?? {}))).digest("hex");
}
