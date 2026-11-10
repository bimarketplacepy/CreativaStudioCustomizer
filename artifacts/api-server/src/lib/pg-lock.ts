import { pool } from "@workspace/db";

/**
 * Ejecuta `fn` con un candado de Postgres (pg_advisory_lock) sobre `key`: dos
 * llamadas con la misma clave nunca corren a la vez, aunque lleguen a
 * instancias distintas de la publicación (autoscale). Lo usan «Comprar» y
 * «Enviar pedido» para que un doble clic no duplique pedidos ni presupuestos.
 * El candado se libera aunque `fn` falle.
 */
export async function withPgLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const conn = await pool.connect();
  try {
    await conn.query("select pg_advisory_lock(hashtext($1))", [key]);
    try {
      return await fn();
    } finally {
      await conn.query("select pg_advisory_unlock(hashtext($1))", [key]);
    }
  } finally {
    conn.release();
  }
}
