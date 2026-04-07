import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { jobsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import multer from "multer";
import { extractTextFromBuffer, parseJobDescription } from "../lib/azure";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-jd", upload.single("jd"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No JD file uploaded" });

    // Determine mime type
    const ext = (file.originalname ?? "").split(".").pop()?.toLowerCase();
    let mimeType = file.mimetype;
    if (!mimeType || mimeType === "application/octet-stream") {
      if (ext === "pdf") mimeType = "application/pdf";
      else if (ext === "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else mimeType = "text/plain";
    }

    let jdText: string;
    if (ext === "txt" || mimeType === "text/plain") {
      // Plain text: no need for Document Intelligence
      jdText = file.buffer.toString("utf-8");
    } else {
      // PDF / DOCX: use Azure Document Intelligence
      jdText = await extractTextFromBuffer(file.buffer, mimeType);
    }

    if (!jdText || jdText.trim().length < 50) {
      return res.status(422).json({ error: "Could not extract readable text from the uploaded file. Please try a different format." });
    }

    // Use AI to parse title, department, skills, experience, education
    const parsed = await parseJobDescription(jdText);
    res.json(parsed);
  } catch (err) {
    console.error("JD upload error:", err);
    res.status(500).json({ error: "JD processing failed. Please check the file and try again." });
  }
});

router.get("/jobs", async (_req, res) => {
  try {
    const jobs = await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
    const jobsWithCount = await Promise.all(
      jobs.map(async (job) => {
        const result = await db.execute(
          sql`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'screened' THEN 1 END) as screened FROM resumes WHERE job_id = ${job.id}`,
        );
        const row = (result.rows[0] as { total: string; screened: string }) ?? {
          total: "0",
          screened: "0",
        };
        return {
          ...job,
          resumeCount: parseInt(row.total, 10),
          screenedCount: parseInt(row.screened, 10),
          requiredSkills: job.requiredSkills ?? [],
          createdAt: job.createdAt.toISOString(),
        };
      }),
    );
    res.json(jobsWithCount);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

router.post("/jobs", async (req, res) => {
  try {
    const {
      jobRefNumber,
      title,
      department,
      description,
      requiredSkills,
      experienceRequired,
      educationRequired,
    } = req.body;
    if (!jobRefNumber || !title || !description) {
      res
        .status(400)
        .json({ error: "jobRefNumber, title, and description are required" });
      return;
    }
    const id = randomUUID();
    const [job] = await db
      .insert(jobsTable)
      .values({
        id,
        jobRefNumber,
        title,
        department: department ?? null,
        description,
        requiredSkills: requiredSkills ?? [],
        experienceRequired: experienceRequired ?? null,
        educationRequired: educationRequired ?? null,
        status: "active",
      })
      .returning();
    res.status(201).json({
      ...job,
      requiredSkills: job.requiredSkills ?? [],
      resumeCount: 0,
      screenedCount: 0,
      createdAt: job.createdAt.toISOString(),
    });
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error && err.message.includes("unique")) {
      res.status(409).json({ error: "Job Reference Number already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create job" });
  }
});

router.get("/jobs/:jobId", async (req, res) => {
  try {
    const [job] = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, req.params.jobId));
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    const result = await db.execute(
      sql`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'screened' THEN 1 END) as screened FROM resumes WHERE job_id = ${job.id}`,
    );
    const row = (result.rows[0] as { total: string; screened: string }) ?? {
      total: "0",
      screened: "0",
    };
    res.json({
      ...job,
      requiredSkills: job.requiredSkills ?? [],
      resumeCount: parseInt(row.total, 10),
      screenedCount: parseInt(row.screened, 10),
      createdAt: job.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

// Update (edit) a job profile
router.put("/jobs/:jobId", async (req, res) => {
  try {
    const [existing] = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, req.params.jobId));
    if (!existing) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const {
      title,
      department,
      description,
      requiredSkills,
      experienceRequired,
      educationRequired,
    } = req.body;

    const [updated] = await db
      .update(jobsTable)
      .set({
        title: title ?? existing.title,
        department: department ?? existing.department,
        description: description ?? existing.description,
        requiredSkills: requiredSkills ?? existing.requiredSkills,
        experienceRequired: experienceRequired ?? existing.experienceRequired,
        educationRequired: educationRequired ?? existing.educationRequired,
      })
      .where(eq(jobsTable.id, req.params.jobId))
      .returning();

    res.json({
      ...updated,
      requiredSkills: updated.requiredSkills ?? [],
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update job" });
  }
});

// Mark a job as completed or re-activate it
router.patch("/jobs/:jobId/status", async (req, res) => {
  try {
    const [existing] = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, req.params.jobId));
    if (!existing) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const { status } = req.body;
    if (!["active", "completed"].includes(status)) {
      res.status(400).json({ error: "Status must be 'active' or 'completed'" });
      return;
    }

    const [updated] = await db
      .update(jobsTable)
      .set({ status })
      .where(eq(jobsTable.id, req.params.jobId))
      .returning();

    res.json({
      ...updated,
      requiredSkills: updated.requiredSkills ?? [],
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update job status" });
  }
});

router.delete("/jobs/:jobId", async (req, res) => {
  try {
    const [job] = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, req.params.jobId));
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    await db.delete(jobsTable).where(eq(jobsTable.id, req.params.jobId));
    res.json({ success: true, message: "Job deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

export default router;
