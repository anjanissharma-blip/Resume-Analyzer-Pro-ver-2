import { pgTable, text } from "drizzle-orm/pg-core";

export const billingSettingsTable = pgTable("billing_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type BillingSetting = typeof billingSettingsTable.$inferSelect;
