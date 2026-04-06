import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const billingSettingsTable = pgTable("billing_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const reportPrintsTable = pgTable("report_prints", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'individual' | 'consolidated'
  jobId: text("job_id"),
  printedAt: timestamp("printed_at").defaultNow().notNull(),
});

export type BillingSetting = typeof billingSettingsTable.$inferSelect;
export type ReportPrint = typeof reportPrintsTable.$inferSelect;
