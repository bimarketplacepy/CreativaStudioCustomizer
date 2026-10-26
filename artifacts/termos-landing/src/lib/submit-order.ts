import { createOrder, type CreateOrderRequest, type CreateOrderResponse } from "@workspace/api-client-react";

/** Espera máxima del primer intento: el pedido sube imágenes de varios MB y en
 *  datos móviles 8 s no alcanzaban (el diseño no llegaba al taller). */
export const ORDER_TIMEOUT_MS = 30_000;
/** Reintento liviano (sin imágenes): si el primero llegó al server, devuelve
 *  ese mismo pedido; si no, crea uno solo con los datos. */
const RETRY_TIMEOUT_MS = 10_000;
/** Con el archivo de la Dacen de un fondo 360° (PNG de ~8–11 MB a 300 dpi) la
 *  subida tarda más: el primer intento espera hasta 2 minutos. */
const HEAVY_TIMEOUT_MS = 120_000;
const HEAVY_BYTES = 4 * 1024 * 1024;

const newRequestId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

async function attempt(payload: CreateOrderRequest, timeoutMs: number): Promise<CreateOrderResponse> {
  // AbortController (no Promise.race): al vencer, la subida se corta de verdad
  // y el server no termina creando un pedido que el cliente nunca ve.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("order timeout")), timeoutMs);
  try {
    return await createOrder(payload, { signal: ctrl.signal });
  } catch (err) {
    throw ctrl.signal.aborted ? new Error("order timeout") : err;
  } finally {
    clearTimeout(timer);
  }
}

/** 4xx (datos inválidos, demasiados pedidos): reintentar no cambia nada. */
const isClientError = (err: unknown) => {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" && status >= 400 && status < 500;
};

/**
 * Crea el pedido con un `requestId` en designState para que el server no lo
 * duplique. Si el primer intento falla por red o tiempo, reintenta una vez sin
 * imágenes con el mismo id: así el cliente casi siempre sale con número de
 * pedido, y nunca quedan pedidos en /admin que no llegaron al chat.
 */
export async function submitOrder(payload: CreateOrderRequest): Promise<CreateOrderResponse> {
  const withId: CreateOrderRequest = {
    ...payload,
    designState: { ...payload.designState, requestId: newRequestId() },
  };
  try {
    const heavy = (payload.productionImage?.length ?? 0) > HEAVY_BYTES;
    return await attempt(withId, heavy ? HEAVY_TIMEOUT_MS : ORDER_TIMEOUT_MS);
  } catch (err) {
    if (isClientError(err)) throw err;
    const { previewImage: _p, customImage: _c, productionImage: _pr, ...light } = withId;
    return attempt(light, RETRY_TIMEOUT_MS);
  }
}
