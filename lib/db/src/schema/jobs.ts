import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobsTable = pgTable("jobs", {
  id: text("id").primaryKey(),
  jobRefNumber: text("job_ref_number").notNull().unique(),
  title: text("title").notNull(),
  department: text("department"),
  description: text("description").notNull(),
  requiredSkills: text("required_skills").array().default([]),
  experienceRequired: text("experience_required"),
  educationRequired: text("education_required"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({
  createdAt: true,
});
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
