import { pgTable, text, timestamp, real, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resumesTable = pgTable("resumes", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileData: text("file_data"),
  status: text("status").notNull().default("pending"),
  candidateName: text("candidate_name"),
  candidateEmail: text("candidate_email"),
  candidatePhone: text("candidate_phone"),
  candidateAddress: text("candidate_address"),
  skills: text("skills").array().default([]),
  experience: jsonb("experience").default([]),
  education: jsonb("education").default([]),
  extractedText: text("extracted_text"),
  atsScore: real("ats_score"),
  suitabilityScore: real("suitability_score"),
  matchingSkills: text("matching_skills").array().default([]),
  skillGaps: text("skill_gaps").array().default([]),
  experienceMatch: text("experience_match"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  screenedAt: timestamp("screened_at"),
  totalTokens: integer("total_tokens").default(0),
  isReanalysis: boolean("is_reanalysis").default(false),
});

export const insertResumeSchema = createInsertSchema(resumesTable).omit({
  createdAt: true,
  screenedAt: true,
});
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumesTable.$inferSelect;
