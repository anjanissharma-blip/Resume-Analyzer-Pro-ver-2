import { Router, type IRouter } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { resumesTable, jobsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { extractTextFromBuffer, parseCandidateInfo, evaluateAgainstJob, MIN_READABLE_TEXT_LENGTH } from "../lib/azure.js";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported. Use PDF, DOCX, or TXT.`));
    }
  },
});

router.get("/jobs/:jobId/resumes", async (req, res) => {
  try {
    const resumes = await db.select().from(resumesTable).where(eq(resumesTable.jobId, req.params.jobId)).orderBy(resumesTable.createdAt);
    res.json(resumes.map(r => ({
      ...r,
      skills: r.skills ?? [],
      matchingSkills: r.matchingSkills ?? [],
      skillGaps: r.skillGaps ?? [],
      createdAt: r.createdAt.toISOString(),
      screenedAt: r.screenedAt?.toISOString() ?? null,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch resumes" });
  }
});

router.post("/resumes/upload", upload.array("files"), async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) { res.status(400).json({ error: "jobId is required" }); return; }

    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) { res.status(400).json({ error: "No files uploaded" }); return; }

    const resumeIds: string[] = [];

    for (const file of files) {
      const id = randomUUID();
      const mimeMap: Record<string, string> = {
        "application/pdf": "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain": "text/plain",
      };
      const mimeType = mimeMap[file.mimetype] ?? "text/plain";

      await db.insert(resumesTable).values({
        id,
        jobId,
        fileName: file.originalname,
        fileType: mimeType,
        fileData: file.buffer.toString("base64"),
        status: "pending",
      });

      resumeIds.push(id);
      processResumeAsync(id, file.buffer, mimeType, job.description, job.requiredSkills ?? [], job.experienceRequired ?? undefined, job.educationRequired ?? undefined);
    }

    res.json({
      uploaded: files.length,
      resumeIds,
      message: `${files.length} resume(s) uploaded and queued for processing`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload resumes" });
  }
});

async function processResumeAsync(
  resumeId: string,
  buffer: Buffer,
  mimeType: string,
  jobDescription: string,
  requiredSkills: string[],
  experienceRequired?: string,
  educationRequired?: string
) {
  try {
    await db.update(resumesTable).set({ status: "processing" }).where(eq(resumesTable.id, resumeId));

    let extractedText = "";
    if (mimeType === "text/plain") {
      extractedText = buffer.toString("utf-8");
    } else {
      extractedText = await extractTextFromBuffer(buffer, mimeType);
    }

    // Guard: unreadable / blank resume
    const cleanedText = extractedText.trim().replace(/\s+/g, " ");
    if (cleanedText.length < MIN_READABLE_TEXT_LENGTH) {
      console.warn(`Resume ${resumeId} has insufficient text (${cleanedText.length} chars) — marking unreadable`);
      await db.update(resumesTable).set({
        status: "unreadable",
        extractedText: extractedText || "(no text extracted)",
        aiSummary: "This resume could not be read. The file may be image-based, password-protected, or otherwise unreadable by the AI.",
      }).where(eq(resumesTable.id, resumeId));
      return;
    }

    const candidate = await parseCandidateInfo(extractedText);
    const screening = await evaluateAgainstJob(extractedText, jobDescription, requiredSkills, experienceRequired, educationRequired);
    const totalTokens = (candidate.tokens ?? 0) + (screening.tokens ?? 0);

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
      totalTokens,
      isReanalysis: false,
    }).where(eq(resumesTable.id, resumeId));
  } catch (err) {
    console.error(`Failed to process resume ${resumeId}:`, err);
    await db.update(resumesTable).set({ status: "failed" }).where(eq(resumesTable.id, resumeId));
  }
}

router.get("/resumes/:resumeId", async (req, res) => {
  try {
    const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, req.params.resumeId));
    if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }
    res.json({
      ...resume,
      skills: resume.skills ?? [],
      matchingSkills: resume.matchingSkills ?? [],
      skillGaps: resume.skillGaps ?? [],
      fileData: undefined,
      extractedText: undefined,
      createdAt: resume.createdAt.toISOString(),
      screenedAt: resume.screenedAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch resume" });
  }
});

router.delete("/resumes/:resumeId", async (req, res) => {
  try {
    const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, req.params.resumeId));
    if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }
    await db.delete(resumesTable).where(eq(resumesTable.id, req.params.resumeId));
    res.json({ success: true, message: "Resume deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete resume" });
  }
});

export default router;
