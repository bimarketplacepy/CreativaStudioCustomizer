/**
 * Clave de acceso interno (panel /admin y archivo de producción).
 * Por pedido del negocio la contraseña por defecto es "creativa123";
 * definir INTERNAL_ACCESS_KEY en los Secrets la reemplaza sin tocar código
 * (recomendado si el panel crece en sensibilidad).
 */
const INTERNAL_KEY = process.env.INTERNAL_ACCESS_KEY || "creativa123";

export function checkInternalKey(got: unknown): boolean {
  return typeof got === "string" && got.length > 0 && got === INTERNAL_KEY;
}
