import {
  pgTable,
  pgEnum,
  pgSequence,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Ciclo de vida de un pedido del personalizador. */
export const orderStatusEnum = pgEnum("order_status", [
  "nueva",
  "en_proceso",
  "completada",
  "cancelada",
]);

/**
 * Secuencia dedicada para el número legible de pedido ("CS-0001").
 * `nextval()` es atómico en Postgres, así que dos pedidos simultáneos jamás
 * comparten número — sin transacciones ni retries en el server.
 */
export const orderNumberSeq = pgSequence("orders_number_seq", {
  startWith: 1,
  increment: 1,
});

export const ordersTable = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Legible y único: "CS-" + secuencial con padding (CS-0001). Lo genera el server. */
  orderNumber: varchar("order_number", { length: 20 }).notNull().unique(),
  status: orderStatusEnum("status").notNull().default("nueva"),
  /** Tipo de producto (Termo, Chopera, Hoppie, Bolígrafo, …). */
  product: varchar("product", { length: 120 }).notNull(),
  material: varchar("material", { length: 120 }).notNull(),
  /** Nombre + hex, ej. "Borgoña (#6d2434)". Null para materiales sin color. */
  color: varchar("color", { length: 120 }),
  /** Grabado láser / Impresión UV / Plotter de corte. */
  technique: varchar("technique", { length: 120 }).notNull(),
  customText: text("custom_text"),
  font: varchar("font", { length: 120 }),
  /** Solo aplica cuando la técnica es impresión UV. */
  textColor: varchar("text_color", { length: 40 }),
  iconName: varchar("icon_name", { length: 120 }),
  hasUploadedImage: boolean("has_uploaded_image").notNull().default(false),
  /** Snapshot completo del estado del diseño (posiciones, tamaños, plan, etc.)
   *  para poder reabrir/reproducir la personalización después. */
  designState: jsonb("design_state").notNull(),
  /** Nombre del objeto en el storage (ej. "orders/CS-0001.jpg"). */
  previewImagePath: varchar("preview_image_path", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderStatus = Order["status"];
