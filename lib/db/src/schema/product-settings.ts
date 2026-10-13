import { pgTable, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Ajustes por producto del catálogo, que se manejan desde el panel interno.
 * Clave = nombre del modelo tal como lo arma el catálogo ("Vaso Mini Coffee
 * Mug"): el id de plantilla de Odoo puede cambiar entre sincronizaciones.
 * Sin fila = habilitado.
 */
export const productSettingsTable = pgTable("product_settings", {
  name: varchar("name", { length: 200 }).primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ProductSetting = typeof productSettingsTable.$inferSelect;
