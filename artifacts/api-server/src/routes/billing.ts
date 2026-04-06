import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { billingSettingsTable, resumesTable, jobsTable } from "@workspace/db/schema";
import { eq, sum, count, and } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULTS: Record<string, string> = {
  openai_cost_per_1k_tokens: "0.01",
  doc_intel_cost_per_page: "0.0015",
};

async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(billingSettingsTable).where(eq(billingSettingsTable.key, key));
  return row?.value ?? DEFAULTS[key] ?? "0";
}

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
    const { openai_cost_per_1k_tokens, doc_intel_cost_per_page } = req.body as Record<string, string>;
    const updates: { key: string; value: string }[] = [];
    if (openai_cost_per_1k_tokens !== undefined) updates.push({ key: "openai_cost_per_1k_tokens", value: String(openai_cost_per_1k_tokens) });
    if (doc_intel_cost_per_page !== undefined) updates.push({ key: "doc_intel_cost_per_page", value: String(doc_intel_cost_per_page) });

    for (const { key, value } of updates) {
      await db.insert(billingSettingsTable).values({ key, value })
        .onConflictDoUpdate({ target: billingSettingsTable.key, set: { value } });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save billing settings" });
  }
});

router.get("/billing/costs", async (_req, res) => {
  try {
    const openaiRate = parseFloat(await getSetting("openai_cost_per_1k_tokens"));
    const docIntelRate = parseFloat(await getSetting("doc_intel_cost_per_page"));
    const MARGIN = 2.5; // 150% on top = 2.5×

    const resumes = await db
      .select({
        jobId: resumesTable.jobId,
        status: resumesTable.status,
        totalTokens: resumesTable.totalTokens,
        isReanalysis: resumesTable.isReanalysis,
      })
      .from(resumesTable);

    const jobs = await db.select({ id: jobsTable.id, title: jobsTable.title, jobRefNumber: jobsTable.jobRefNumber }).from(jobsTable);
    const jobMap = new Map(jobs.map(j => [j.id, j]));

    const screened = resumes.filter(r => r.status === "screened" || r.status === "unreadable");

    const totalTokens = screened.reduce((s, r) => s + (r.totalTokens ?? 0), 0);
    const totalDocPages = screened.length;

    const baseOpenAICost = (totalTokens / 1000) * openaiRate;
    const baseDocCost = totalDocPages * docIntelRate;
    const baseCost = baseOpenAICost + baseDocCost;
    const totalCost = baseCost * MARGIN;

    const reanalysisResumes = screened.filter(r => r.isReanalysis);
    const reanalysisTokens = reanalysisResumes.reduce((s, r) => s + (r.totalTokens ?? 0), 0);
    const reanalysisDocPages = reanalysisResumes.length;
    const reanalysisBase = ((reanalysisTokens / 1000) * openaiRate) + (reanalysisDocPages * docIntelRate);
    const reanalysisCost = reanalysisBase * MARGIN;

    const computeHours = (screened.length * 30) / 3600;

    const perJobMap: Record<string, {
      jobId: string; jobTitle: string; jobRefNumber: string;
      screenedCount: number; tokens: number; cost: number;
      reanalysisCount: number; reanalysisCost: number;
    }> = {};

    for (const r of screened) {
      if (!perJobMap[r.jobId]) {
        const job = jobMap.get(r.jobId);
        perJobMap[r.jobId] = {
          jobId: r.jobId,
          jobTitle: job?.title ?? "Unknown",
          jobRefNumber: job?.jobRefNumber ?? "-",
          screenedCount: 0, tokens: 0, cost: 0,
          reanalysisCount: 0, reanalysisCost: 0,
        };
      }
      const entry = perJobMap[r.jobId];
      entry.screenedCount++;
      entry.tokens += (r.totalTokens ?? 0);
      const itemBase = ((r.totalTokens ?? 0) / 1000 * openaiRate) + docIntelRate;
      entry.cost += itemBase * MARGIN;
      if (r.isReanalysis) {
        entry.reanalysisCount++;
        entry.reanalysisCost += itemBase * MARGIN;
      }
    }

    res.json({
      totalTokens,
      totalDocPages,
      totalCost,
      baseOpenAICost,
      baseDocCost,
      reanalysisTokens,
      reanalysisDocPages,
      reanalysisCost,
      computeHours,
      screenedCount: screened.length,
      margin: 150,
      settings: { openaiRate, docIntelRate },
      perJob: Object.values(perJobMap).sort((a, b) => b.cost - a.cost),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute costs" });
  }
});

export default router;
