import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resumesTable, jobsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/reports/resume/:resumeId", async (req, res) => {
  try {
    const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, req.params.resumeId));
    if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }

    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, resume.jobId));

    const report = {
      jobRefNumber: job?.jobRefNumber ?? "N/A",
      jobTitle: job?.title ?? "N/A",
      candidateName: resume.candidateName ?? "Unknown",
      candidateEmail: resume.candidateEmail ?? "N/A",
      candidatePhone: resume.candidatePhone ?? "N/A",
      candidateAddress: resume.candidateAddress ?? "N/A",
      skills: resume.skills ?? [],
      experience: resume.experience ?? [],
      education: resume.education ?? [],
      atsScore: resume.atsScore ?? 0,
      suitabilityScore: resume.suitabilityScore ?? 0,
      matchingSkills: resume.matchingSkills ?? [],
      skillGaps: resume.skillGaps ?? [],
      experienceMatch: resume.experienceMatch ?? "N/A",
      aiSummary: resume.aiSummary ?? "Not available",
      reportGeneratedAt: new Date().toISOString(),
    };

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

router.get("/reports/batch/:jobId", async (req, res) => {
  try {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, req.params.jobId));
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    const resumes = await db.select().from(resumesTable).where(eq(resumesTable.jobId, req.params.jobId));

    const headers = [
      "Job Ref Number", "Job Title", "Candidate Name", "Email", "Phone", "Address",
      "Skills", "ATS Score", "Suitability Score", "Matching Skills", "Skill Gaps",
      "Experience Match", "AI Summary", "Status", "Screened At"
    ];

    const rows = resumes.map(r => [
      job.jobRefNumber,
      job.title,
      r.candidateName ?? "",
      r.candidateEmail ?? "",
      r.candidatePhone ?? "",
      r.candidateAddress ?? "",
      (r.skills ?? []).join("; "),
      r.atsScore?.toFixed(1) ?? "",
      r.suitabilityScore?.toFixed(1) ?? "",
      (r.matchingSkills ?? []).join("; "),
      (r.skillGaps ?? []).join("; "),
      r.experienceMatch ?? "",
      (r.aiSummary ?? "").replace(/"/g, '""').replace(/\n/g, " "),
      r.status,
      r.screenedAt?.toISOString() ?? "",
    ]);

    const csvRows = [headers, ...rows].map(row =>
      row.map(cell => {
        const str = String(cell);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str}"`;
        }
        return str;
      }).join(",")
    );

    const csv = csvRows.join("\n");
    const filename = `${job.jobRefNumber}_batch_report_${new Date().toISOString().split("T")[0]}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate batch report" });
  }
});

export default router;
