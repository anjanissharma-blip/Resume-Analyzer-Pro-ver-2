import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resumesTable, jobsTable } from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { extractTextFromBuffer, parseCandidateInfo, evaluateAgainstJob, MIN_READABLE_TEXT_LENGTH } from "../lib/azure.js";

const router: IRouter = Router();

async function screenOneResume(resumeId: string, jobId?: string) {
  const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, resumeId));
  if (!resume) throw new Error("Resume not found");

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId ?? resume.jobId));
  if (!job) throw new Error("Associated job not found");

  await db.update(resumesTable).set({ status: "processing" }).where(eq(resumesTable.id, resume.id));

  // Extract text
  let extractedText = resume.extractedText ?? "";
  if (!extractedText && resume.fileData) {
    const buffer = Buffer.from(resume.fileData, "base64");
    if (resume.fileType === "text/plain") {
      extractedText = buffer.toString("utf-8");
    } else {
      extractedText = await extractTextFromBuffer(buffer, resume.fileType);
    }
  }

  // Guard: unreadable / blank resume
  const cleanedText = extractedText.trim().replace(/\s+/g, " ");
  if (cleanedText.length < MIN_READABLE_TEXT_LENGTH) {
    console.warn(`Resume ${resumeId} (${resume.fileName}) has insufficient text (${cleanedText.length} chars) — marking unreadable`);
    await db.update(resumesTable).set({
      status: "unreadable",
      extractedText: extractedText || "(no text extracted)",
      aiSummary: "This resume could not be read. The file may be image-based, password-protected, or otherwise unreadable.",
    }).where(eq(resumesTable.id, resume.id));
    return { status: "unreadable", resumeId: resume.id };
  }

  // Parse candidate info and evaluate
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

  return { status: "screened", resumeId: resume.id, ...screening };
}

router.post("/screening/:resumeId", async (req, res) => {
  try {
    const result = await screenOneResume(req.params.resumeId);
    res.json(result);
  } catch (err) {
    console.error("Screening error:", err);
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
          await screenOneResume(resume.id, req.params.jobId);
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

router.post("/screening/rescreen-all/:jobId", async (req, res) => {
  try {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, req.params.jobId));
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    const allResumes = await db.select().from(resumesTable).where(
      eq(resumesTable.jobId, req.params.jobId)
    );

    const rescreenable = allResumes.filter(r => r.status !== "unreadable" && r.status !== "processing");

    if (rescreenable.length === 0) {
      res.json({ jobId: job.id, total: 0, message: "No resumes to re-evaluate" });
      return;
    }

    for (const resume of rescreenable) {
      await db.update(resumesTable).set({ status: "pending" }).where(eq(resumesTable.id, resume.id));
    }

    res.json({
      jobId: job.id,
      total: rescreenable.length,
      message: `${rescreenable.length} resume(s) queued for re-evaluation`,
    });

    (async () => {
      for (const resume of rescreenable) {
        try {
          await screenOneResume(resume.id, req.params.jobId);
        } catch (err) {
          console.error(`Re-screen: failed to screen resume ${resume.id}:`, err);
          await db.update(resumesTable).set({ status: "failed" }).where(eq(resumesTable.id, resume.id));
        }
      }
    })();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Re-evaluation failed" });
  }
});

export default router;
