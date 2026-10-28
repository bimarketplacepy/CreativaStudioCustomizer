/**
 * Cliente mínimo de la API externa de Odoo (JSON-RPC: /jsonrpc, servicios
 * "common" y "object"). Es la API estándar y estable de Odoo: funciona igual en
 * Odoo Online, Odoo.sh y servidor propio (v14–v18), sin módulos extra.
 *
 * Configuración (Secrets de Replit):
 *   ODOO_URL      https://tu-empresa.odoo.com   (si trae ruta, ej. /odoo, se ignora)
 *   ODOO_DB       nombre de la base de datos
 *   ODOO_USER     login del usuario de API (ideal: usuario interno de solo lectura)
 *   ODOO_API_KEY  API key de ese usuario (Preferencias → Seguridad de la cuenta)
 *
 * Sin estas variables la integración queda apagada y la landing usa su
 * catálogo propio (ver catalog.ts).
 */

export interface OdooConfig {
  url: string;
  db: string;
  user: string;
  apiKey: string;
}

export function odooConfig(): OdooConfig | null {
  // Solo el origen (https://empresa.odoo.com): la API vive en la raíz. Pegar la
  // URL del navegador (".../odoo" en v17+, ".../web#...") mandaba las llamadas a
  // una página web y Odoo respondía 400 "invalid CSRF token".
  let url: string | undefined;
  try { url = process.env.ODOO_URL ? new URL(process.env.ODOO_URL.trim()).origin : undefined; } catch { url = undefined; }
  const db = process.env.ODOO_DB?.trim();
  const user = process.env.ODOO_USER?.trim();
  const apiKey = process.env.ODOO_API_KEY?.trim();
  return url && db && user && apiKey ? { url, db, user, apiKey } : null;
}

const TIMEOUT_MS = 15_000;

export class OdooError extends Error {}

// ── Freno duro anti-producción ──────────────────────────────────────────────
// La landing SOLO puede escribir en producción si alguien lo habilita a mano
// con ODOO_ALLOW_PRODUCTION_WRITES=si. Cualquier otro entorno (base de
// pruebas, staging) escribe normal. Lectura siempre permitida.
export const PRODUCTION_HOSTS = new Set(["marketplace.odoo.com"]);
export const PRODUCTION_DBS = new Set(["marketplace-main-33409600"]);

/** Métodos que solo leen. Todo lo demás se considera escritura. */
const READ_METHODS = new Set([
  "search", "search_read", "search_count", "search_fetch", "read", "read_group",
  "fields_get", "name_search", "name_get", "default_get", "get_views", "get_metadata",
  "check_access_rights", "check_access_rule", "check_access", "has_access", "has_group",
  "web_search_read", "web_read", "web_read_group", "export_data", "copy_data", "onchange",
  "exists", "get_field_translations", "load_views", "fields_view_get",
]);

export const isReadMethod = (method: string): boolean => READ_METHODS.has(method);

export function isProductionConfig(cfg: Pick<OdooConfig, "url" | "db">): boolean {
  let host = "";
  try { host = new URL(cfg.url).hostname.toLowerCase(); } catch { host = cfg.url.toLowerCase(); }
  return PRODUCTION_HOSTS.has(host) || PRODUCTION_DBS.has(cfg.db.trim());
}

export class OdooProductionWriteBlocked extends OdooError {
  constructor(model: string, method: string) {
    super(`Escritura bloqueada: ${model}.${method} apunta al Odoo de PRODUCCIÓN ` +
      "(freno de seguridad; habilitar solo con ODOO_ALLOW_PRODUCTION_WRITES=si).");
  }
}

/** Lanza si el método escribe y la configuración es la de producción sin habilitación explícita. */
export function assertWriteAllowed(cfg: Pick<OdooConfig, "url" | "db">, model: string, method: string, env: NodeJS.ProcessEnv = process.env): void {
  if (isReadMethod(method)) return;
  if (!isProductionConfig(cfg)) return;
  if (env.ODOO_ALLOW_PRODUCTION_WRITES?.trim() === "si") return;
  throw new OdooProductionWriteBlocked(model, method);
}

export class OdooClient {
  private uid: number | null = null;
  private fieldsCache = new Map<string, Set<string>>();

  private readonly cfg: OdooConfig;

  constructor(cfg: OdooConfig) {
    this.cfg = cfg;
  }

  private async rpc<T>(service: string, method: string, args: unknown[]): Promise<T> {
    const res = await fetch(`${this.cfg.url}/jsonrpc`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: Date.now() }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new OdooError(`Odoo HTTP ${res.status}`);
    const body = (await res.json()) as { result?: T; error?: { message?: string; data?: { message?: string } } };
    if (body.error) {
      throw new OdooError(body.error.data?.message || body.error.message || "Odoo error");
    }
    return body.result as T;
  }

  private async login(): Promise<number> {
    if (this.uid) return this.uid;
    const uid = await this.rpc<number | false>("common", "authenticate", [
      this.cfg.db, this.cfg.user, this.cfg.apiKey, {},
    ]);
    if (!uid) throw new OdooError("Odoo: usuario o API key inválidos");
    this.uid = uid;
    return uid;
  }

  async call<T>(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<T> {
    // Antes de autenticar siquiera: una escritura contra producción no sale de acá.
    assertWriteAllowed(this.cfg, model, method);
    const uid = await this.login();
    return this.rpc<T>("object", "execute_kw", [this.cfg.db, uid, this.cfg.apiKey, model, method, args, kwargs]);
  }

  /** Campos existentes del modelo (varían según versión y módulos instalados). */
  async fields(model: string): Promise<Set<string>> {
    const hit = this.fieldsCache.get(model);
    if (hit) return hit;
    const f = await this.call<Record<string, unknown>>(model, "fields_get", [], { attributes: ["type"] });
    const set = new Set(Object.keys(f));
    this.fieldsCache.set(model, set);
    return set;
  }

  /** search_read pidiendo solo los campos que existen en esta instancia. */
  async searchRead<T>(model: string, domain: unknown[], wanted: string[], kwargs: Record<string, unknown> = {}): Promise<T[]> {
    const have = await this.fields(model);
    const fields = wanted.filter(f => have.has(f));
    return this.call<T[]>(model, "search_read", [domain], { fields, ...kwargs });
  }

  get baseUrl(): string {
    return this.cfg.url;
  }

  get db(): string {
    return this.cfg.db;
  }

  get isProduction(): boolean {
    return isProductionConfig(this.cfg);
  }
}
