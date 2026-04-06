import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { billingSettingsTable, resumesTable, jobsTable, reportPrintsTable } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULTS: Record<string, string> = {
  rate_resume_scan:          "0.50",
  rate_resume_rescan:        "0.50",
  rate_consolidated_report:  "0.25",
  rate_individual_report:    "0.10",
  rate_job_creation:         "1.00",
  settings_password:         "aces2026",
};

async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(billingSettingsTable).where(eq(billingSettingsTable.key, key));
  return row?.value ?? DEFAULTS[key] ?? "0";
}

async function upsert(key: string, value: string) {
  await db.insert(billingSettingsTable).values({ key, value })
    .onConflictDoUpdate({ target: billingSettingsTable.key, set: { value } });
}

router.post("/billing/verify-password", async (req, res) => {
  try {
    const { password } = req.body as { password: string };
    const stored = await getSetting("settings_password");
    res.json({ ok: password === stored });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/billing/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(billingSettingsTable);
    const map: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) map[row.key] = row.value;
    res.json(map);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch billing settings" });
  }
});

router.post("/billing/settings", async (req, res) => {
  try {
    const body = req.body as Record<string, string>;
    const allowed = [
      "rate_resume_scan", "rate_resume_rescan",
      "rate_consolidated_report", "rate_individual_report",
      "rate_job_creation",
    ];
    for (const key of allowed) {
      if (body[key] !== undefined) await upsert(key, String(body[key]));
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save billing settings" });
  }
});

router.post("/billing/track-print", async (req, res) => {
  try {
    const { type, jobId } = req.body as { type: "individual" | "consolidated"; jobId?: string };
    if (type !== "individual" && type !== "consolidated") {
      return res.status(400).json({ error: "Invalid type" });
    }
    await db.insert(reportPrintsTable).values({ type, jobId: jobId ?? null });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to track print" });
  }
});

router.get("/billing/costs", async (_req, res) => {
  try {
    const rateScan        = parseFloat(await getSetting("rate_resume_scan"));
    const rateRescan      = parseFloat(await getSetting("rate_resume_rescan"));
    const rateConsolidated = parseFloat(await getSetting("rate_consolidated_report"));
    const rateIndividual  = parseFloat(await getSetting("rate_individual_report"));
    const rateJob         = parseFloat(await getSetting("rate_job_creation"));

    const resumes = await db
      .select({ jobId: resumesTable.jobId, status: resumesTable.status, isReanalysis: resumesTable.isReanalysis })
      .from(resumesTable);

    const jobs = await db
      .select({ id: jobsTable.id, title: jobsTable.title, jobRefNumber: jobsTable.jobRefNumber })
      .from(jobsTable);
    const jobMap = new Map(jobs.map(j => [j.id, j]));

    const screened = resumes.filter(r => r.status === "screened" || r.status === "unreadable");
    const firstScans  = screened.filter(r => !r.isReanalysis);
    const rescans     = screened.filter(r => r.isReanalysis);

    const scanCost     = firstScans.length * rateScan;
    const rescanCost   = rescans.length * rateRescan;
    const jobCost      = jobs.length * rateJob;

    const [printStats] = await db
      .select({
        type: reportPrintsTable.type,
        cnt: count(),
      })
      .from(reportPrintsTable)
      .groupBy(reportPrintsTable.type);

    const allPrints = await db.select().from(reportPrintsTable);
    const individualPrints = allPrints.filter(p => p.type === "individual").length;
    const consolidatedPrints = allPrints.filter(p => p.type === "consolidated").length;

    const printCost = (individualPrints * rateIndividual) + (consolidatedPrints * rateConsolidated);
    const totalCost = scanCost + rescanCost + jobCost + printCost;

    const perJobMap: Record<string, {
      jobId: string; jobTitle: string; jobRefNumber: string;
      firstScanCount: number; rescanCount: number; cost: number;
    }> = {};

    for (const r of screened) {
      if (!perJobMap[r.jobId]) {
        const job = jobMap.get(r.jobId);
        perJobMap[r.jobId] = {
          jobId: r.jobId,
          jobTitle: job?.title ?? "Unknown",
          jobRefNumber: job?.jobRefNumber ?? "-",
          firstScanCount: 0, rescanCount: 0, cost: 0,
        };
      }
      const entry = perJobMap[r.jobId];
      if (r.isReanalysis) {
        entry.rescanCount++;
        entry.cost += rateRescan;
      } else {
        entry.firstScanCount++;
        entry.cost += rateScan;
      }
    }

    for (const job of jobs) {
      if (!perJobMap[job.id]) {
        perJobMap[job.id] = {
          jobId: job.id,
          jobTitle: job.title,
          jobRefNumber: job.jobRefNumber,
          firstScanCount: 0, rescanCount: 0, cost: 0,
        };
      }
      perJobMap[job.id].cost += rateJob;
    }

    res.json({
      totalCost,
      scanCost, rescanCost, jobCost, printCost,
      firstScanCount: firstScans.length,
      rescanCount: rescans.length,
      jobCount: jobs.length,
      individualPrints, consolidatedPrints,
      rates: { rateScan, rateRescan, rateConsolidated, rateIndividual, rateJob },
      perJob: Object.values(perJobMap).sort((a, b) => b.cost - a.cost),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute costs" });
  }
});

export default router;
