import { eq } from "drizzle-orm";
import { db, productSettingsTable } from "@workspace/db";

// Nombres deshabilitados desde el panel. Se cachean en memoria (el catálogo
// público se pide seguido) y la caché se vacía al cambiar un ajuste.
let disabled: Set<string> | null = null;

export async function getDisabledProducts(): Promise<Set<string>> {
  if (disabled) return disabled;
  const rows = await db
    .select({ name: productSettingsTable.name })
    .from(productSettingsTable)
    .where(eq(productSettingsTable.enabled, false));
  disabled = new Set(rows.map(r => r.name));
  return disabled;
}

export async function setProductEnabled(name: string, enabled: boolean): Promise<void> {
  await db
    .insert(productSettingsTable)
    .values({ name, enabled })
    .onConflictDoUpdate({
      target: productSettingsTable.name,
      set: { enabled, updatedAt: new Date() },
    });
  disabled = null;
}
