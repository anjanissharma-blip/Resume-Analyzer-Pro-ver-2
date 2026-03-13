import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resumesTable, jobsTable } from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { extractTextFromBuffer, parseCandidateInfo, evaluateAgainstJob } from "../lib/azure.js";

const router: IRouter = Router();

router.post("/screening/:resumeId", async (req, res) => {
  try {
    const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, req.params.resumeId));
    if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }

    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, resume.jobId));
    if (!job) { res.status(404).json({ error: "Associated job not found" }); return; }

    await db.update(resumesTable).set({ status: "processing" }).where(eq(resumesTable.id, resume.id));

    let extractedText = resume.extractedText ?? "";
    if (!extractedText && resume.fileData) {
      const buffer = Buffer.from(resume.fileData, "base64");
      if (resume.fileType === "text/plain") {
        extractedText = buffer.toString("utf-8");
      } else {
        extractedText = await extractTextFromBuffer(buffer, resume.fileType);
      }
    }

    const candidate = await parseCandidateInfo(extractedText);
    const screening = await evaluateAgainstJob(
      extractedText,
      job.description,
      job.requiredSkills ?? [],
      job.experienceRequired ?? undefined,
      job.educationRequired ?? undefined
    );

    await db.update(resumesTable).set({
      status: "screened",
      extractedText,
      candidateName: candidate.name ?? null,
      candidateEmail: candidate.email ?? null,
      candidatePhone: candidate.phone ?? null,
      candidateAddress: candidate.address ?? null,
      skills: candidate.skills,
      experience: candidate.experience as unknown as null,
      education: candidate.education as unknown as null,
      atsScore: screening.atsScore,
      suitabilityScore: screening.suitabilityScore,
      matchingSkills: screening.matchingSkills,
      skillGaps: screening.skillGaps,
      experienceMatch: screening.experienceMatch,
      aiSummary: screening.aiSummary,
      screenedAt: new Date(),
    }).where(eq(resumesTable.id, resume.id));

    res.json({
      resumeId: resume.id,
      ...screening,
      status: "screened",
    });
  } catch (err) {
    console.error(err);
    await db.update(resumesTable).set({ status: "failed" }).where(eq(resumesTable.id, req.params.resumeId));
    res.status(500).json({ error: "Screening failed" });
  }
});

router.post("/screening/batch/:jobId", async (req, res) => {
  try {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, req.params.jobId));
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    const pendingResumes = await db.select().from(resumesTable).where(
      and(
        eq(resumesTable.jobId, req.params.jobId),
        ne(resumesTable.status, "screened")
      )
    );

    if (pendingResumes.length === 0) {
      res.json({ jobId: job.id, total: 0, screened: 0, failed: 0, message: "No pending resumes to screen" });
      return;
    }

    res.json({
      jobId: job.id,
      total: pendingResumes.length,
      screened: 0,
      failed: 0,
      message: `${pendingResumes.length} resume(s) queued for batch screening`,
    });

    (async () => {
      for (const resume of pendingResumes) {
        try {
          await db.update(resumesTable).set({ status: "processing" }).where(eq(resumesTable.id, resume.id));
          
          let extractedText = resume.extractedText ?? "";
          if (!extractedText && resume.fileData) {
            const buffer = Buffer.from(resume.fileData, "base64");
            if (resume.fileType === "text/plain") {
              extractedText = buffer.toString("utf-8");
            } else {
              extractedText = await extractTextFromBuffer(buffer, resume.fileType);
            }
          }

          const candidate = await parseCandidateInfo(extractedText);
          const screening = await evaluateAgainstJob(
            extractedText,
            job.description,
            job.requiredSkills ?? [],
            job.experienceRequired ?? undefined,
            job.educationRequired ?? undefined
          );

          await db.update(resumesTable).set({
            status: "screened",
            extractedText,
            candidateName: candidate.name ?? null,
            candidateEmail: candidate.email ?? null,
            candidatePhone: candidate.phone ?? null,
            candidateAddress: candidate.address ?? null,
            skills: candidate.skills,
            experience: candidate.experience as unknown as null,
            education: candidate.education as unknown as null,
            atsScore: screening.atsScore,
            suitabilityScore: screening.suitabilityScore,
            matchingSkills: screening.matchingSkills,
            skillGaps: screening.skillGaps,
            experienceMatch: screening.experienceMatch,
            aiSummary: screening.aiSummary,
            screenedAt: new Date(),
          }).where(eq(resumesTable.id, resume.id));
        } catch (err) {
          console.error(`Batch: failed to screen resume ${resume.id}:`, err);
          await db.update(resumesTable).set({ status: "failed" }).where(eq(resumesTable.id, resume.id));
        }
      }
    })();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Batch screening failed" });
  }
});

export default router;
