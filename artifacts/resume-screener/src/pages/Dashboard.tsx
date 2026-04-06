import { useJobsData } from "@/hooks/use-jobs";
import { useCostStats } from "@/hooks/use-billing";
import { Link } from "wouter";
import {
  Briefcase, Users, CheckCircle, Plus, ArrowRight, FileText,
  DollarSign, RotateCcw, TrendingUp, ChevronDown, ChevronUp, Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useState } from "react";

export function Dashboard() {
  const { data: jobs, isLoading } = useJobsData();
  const { data: costs, isLoading: costsLoading } = useCostStats();

  const activeJobs = jobs?.filter(j => j.status !== "completed") ?? [];
  const totalJobs = activeJobs.length;
  const totalResumes = activeJobs.reduce((s, j) => s + j.resumeCount, 0);
  const totalScreened = activeJobs.reduce((s, j) => s + j.screenedCount, 0);

  const recentJobs = [...activeJobs].reverse().slice(0, 5);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-lg">Uttarayan Recruit — AI-Powered Candidate Screening</p>
        </div>
        <Link href="/jobs/new">
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-xl transition-all w-full sm:w-auto text-base h-11">
            <Plus className="mr-2 h-5 w-5" /> New Job Profile
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Active Job Profiles" value={totalJobs} icon={<Briefcase className="text-blue-600" size={24} />} color="bg-blue-50" delay={0.1} />
          <StatCard title="Total Resumes" value={totalResumes} icon={<Users className="text-indigo-600" size={24} />} color="bg-indigo-50" delay={0.2} />
          <StatCard title="Resumes Screened" value={totalScreened} icon={<CheckCircle className="text-emerald-600" size={24} />} color="bg-emerald-50" delay={0.3} />
        </div>
      )}

      {/* Cost Counter */}
      <CostCounter costs={costs} isLoading={costsLoading} />

      <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="text-primary" size={20} /> Active Job Profiles
          </h2>
          <Link href="/jobs" className="text-primary hover:text-primary/80 font-medium flex items-center text-sm">
            View All <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : recentJobs.length > 0 ? (
          <div className="divide-y divide-border">
            {recentJobs.map((job, idx) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * idx }}
                className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold font-mono border border-slate-200">
                      {job.jobRefNumber}
                    </span>
                    <h3 className="font-bold text-foreground text-lg">{job.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{job.department || "No department specified"}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">{job.resumeCount}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resumes</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{job.screenedCount}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Screened</div>
                  </div>
                  <Link href={`/jobs/${job.id}`}>
                    <Button variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">Open</Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Briefcase className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-bold">No active job profiles</h3>
            <p className="text-muted-foreground mt-1 mb-6 text-sm">Create a job profile to start screening resumes.</p>
            <Link href="/jobs/new">
              <Button className="bg-primary">Create Job Profile</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function CostCounter({ costs, isLoading }: { costs: ReturnType<typeof useCostStats>["data"]; isLoading: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <DollarSign size={20} className="text-primary" /> Cost Counter
        </h2>
        <Link href="/settings" className="text-xs text-primary hover:underline font-medium">Edit Rates</Link>
      </div>

      {isLoading ? (
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : costs ? (
        <>
          {/* Top summary tiles */}
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <CostTile
              label="Total Billable"
              value={`$${fmt(costs.totalCost)}`}
              sub=""
              icon={<TrendingUp size={18} className="text-primary" />}
              accent
            />
            <CostTile
              label="Resumes Scanned"
              value={costs.firstScanCount.toLocaleString()}
              sub=""
              icon={<FileText size={18} className="text-blue-500" />}
            />
            <CostTile
              label="Job Profiles"
              value={costs.jobCount.toLocaleString()}
              sub=""
              icon={<Briefcase size={18} className="text-indigo-500" />}
            />
            <CostTile
              label="Reports Printed"
              value={(costs.individualPrints + costs.consolidatedPrints).toLocaleString()}
              sub=""
              icon={<Printer size={18} className="text-slate-500" />}
            />
          </div>

          {/* Re-scan line */}
          {costs.rescanCount > 0 && (
            <div className="mx-5 mb-4 flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-3">
                <RotateCcw size={16} className="text-amber-600" />
                <div>
                  <div className="text-sm font-bold text-amber-900">Re-scan Cost</div>
                  <div className="text-xs text-amber-700">{costs.rescanCount} re-evaluated @ ${costs.rates.rateRescan}/ea</div>
                </div>
              </div>
              <div className="text-lg font-bold text-amber-900">${fmt(costs.rescanCost)}</div>
            </div>
          )}

          {/* Print breakdown */}
          {(costs.individualPrints > 0 || costs.consolidatedPrints > 0) && (
            <div className="mx-5 mb-4 flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-3">
                <Printer size={16} className="text-slate-500" />
                <div>
                  <div className="text-sm font-bold text-foreground">Print Breakdown</div>
                  <div className="text-xs text-muted-foreground">
                    {costs.individualPrints > 0 && <span>{costs.individualPrints} individual @ ${costs.rates.rateIndividual}</span>}
                    {costs.individualPrints > 0 && costs.consolidatedPrints > 0 && <span className="mx-1">·</span>}
                    {costs.consolidatedPrints > 0 && <span>{costs.consolidatedPrints} consolidated @ ${costs.rates.rateConsolidated}</span>}
                  </div>
                </div>
              </div>
              <div className="text-base font-bold text-foreground">${fmt(costs.printCost)}</div>
            </div>
          )}

          {/* Per-job breakdown (collapsible) */}
          {costs.perJob.length > 0 && (
            <div className="border-t border-border">
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors"
              >
                <span>Cost Breakdown by Job Profile ({costs.perJob.length})</span>
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {expanded && (
                <div className="px-5 pb-4 space-y-2">
                  {costs.perJob.map(job => (
                    <div key={job.jobId} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold font-mono text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{job.jobRefNumber}</span>
                          <span className="text-sm font-semibold text-foreground truncate">{job.jobTitle}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {job.firstScanCount} scanned
                          {job.rescanCount > 0 && <span className="ml-1 text-amber-600">· {job.rescanCount} re-scanned</span>}
                        </div>
                      </div>
                      <div className="text-base font-bold text-foreground ml-4 shrink-0">${fmt(job.cost)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="p-8 text-center text-muted-foreground text-sm">No cost data available yet.</div>
      )}
    </motion.div>
  );
}

function CostTile({ label, value, sub, icon, accent }: {
  label: string; value: string; sub: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 border ${accent ? "bg-primary/5 border-primary/20" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span></div>
      <div className={`text-xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function StatCard({ title, value, icon, color, delay }: { title: string; value: number; icon: React.ReactNode; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow"
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-4xl font-bold text-foreground leading-none">{value}</h3>
      </div>
    </motion.div>
  );
}
