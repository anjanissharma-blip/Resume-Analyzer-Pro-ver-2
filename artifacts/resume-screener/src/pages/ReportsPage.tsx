import { useState } from "react";
import { Link } from "wouter";
import { useJobsData } from "@/hooks/use-jobs";
import { useJobResumes } from "@/hooks/use-resumes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { clsx } from "clsx";
import {
  BarChart3, Download, ChevronDown, ChevronRight,
  User, ShieldCheck, TrendingUp, AlertTriangle, Trophy, Star,
  CheckCircle, XCircle, FileText, FileDown
} from "lucide-react";
import { SingleDownloadDialog, BatchDownloadDialog } from "@/components/DownloadDialog";

export function ReportsPage() {
  const { data: jobs = [], isLoading } = useJobsData();
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  const jobsWithScreened = jobs.filter(j => (j.screenedCount ?? 0) > 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">View and download screening reports across all job references.</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Job References", value: jobs.length, cls: "border-slate-200 bg-slate-50 text-slate-700" },
          { label: "Jobs with Reports", value: jobsWithScreened.length, cls: "border-blue-200 bg-blue-50 text-blue-700" },
          { label: "Total Screened", value: jobs.reduce((s, j) => s + (j.screenedCount ?? 0), 0), cls: "border-orange-200 bg-orange-50 text-orange-700" },
        ].map(s => (
          <div key={s.label} className={clsx("border rounded-2xl p-5 text-center", s.cls)}>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-xs font-semibold uppercase tracking-wide mt-1 opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {jobsWithScreened.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-2xl border border-dashed border-border">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <BarChart3 className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold">No reports yet</h3>
          <p className="text-muted-foreground mt-2 max-w-xs mx-auto text-sm">
            Upload resumes and run AI screening to generate candidate reports.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Job Reports</h2>
          {jobsWithScreened.map(job => (
            <JobReportCard
              key={job.id}
              job={job}
              isExpanded={expandedJobId === job.id}
              onToggle={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JobReportCard({ job, isExpanded, onToggle }: {
  job: { id: string; jobRefNumber: string; title: string; department?: string | null; screenedCount: number; resumeCount: number };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [singleDialog, setSingleDialog] = useState<{ open: boolean; resumeId: string; candidateName?: string }>({
    open: false, resumeId: ""
  });
  const { data: resumes = [], isLoading } = useJobResumes(job.id, { enabled: isExpanded || batchDialogOpen });

  const screened = resumes.filter(r => r.status === "screened");
  const ranked = [...screened].sort((a, b) => {
    const sa = ((a.atsScore ?? 0) + (a.suitabilityScore ?? 0)) / 2;
    const sb = ((b.atsScore ?? 0) + (b.suitabilityScore ?? 0)) / 2;
    return sb - sa;
  });

  return (
    <>
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Job header row */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 cursor-pointer hover:bg-slate-50/60 transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700">
                  {job.jobRefNumber}
                </span>
                <span className="font-bold text-foreground">{job.title}</span>
                {job.department && <Badge variant="outline" className="text-xs">{job.department}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{job.screenedCount} candidate{job.screenedCount !== 1 ? "s" : ""} screened of {job.resumeCount} uploaded</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={e => { e.stopPropagation(); setBatchDialogOpen(true); }}
            >
              <FileDown size={13} /> Download
            </Button>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>

        {/* Expanded candidate cards */}
        {isExpanded && (
          <div className="border-t border-border p-5">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
              </div>
            ) : ranked.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 italic">No screened candidates found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ranked.map((resume, idx) => {
                  const composite = ((resume.atsScore ?? 0) + (resume.suitabilityScore ?? 0)) / 2;
                  const verdict = getVerdict(composite);
                  const matchingSkills = (resume.matchingSkills as string[] ?? []);
                  const skillGaps = (resume.skillGaps as string[] ?? []);
                  return (
                    <div key={resume.id} className="bg-slate-50 border border-border rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                      {/* Card header */}
                      <div className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                          {resume.candidateName ? resume.candidateName.charAt(0).toUpperCase() : <User size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-bold text-foreground text-sm truncate">{resume.candidateName || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground truncate">{resume.candidateEmail || resume.fileName}</div>
                            </div>
                            <RankBadge rank={idx + 1} />
                          </div>
                        </div>
                      </div>

                      {/* Scores */}
                      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                        <ScoreBlock label="ATS" score={resume.atsScore ?? 0} />
                        <ScoreBlock label="Suitability" score={resume.suitabilityScore ?? 0} />
                      </div>

                      {/* Skills summary */}
                      <div className="px-4 pb-3 flex gap-3 text-xs font-semibold">
                        <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                          <CheckCircle size={10} /> {matchingSkills.length} match
                        </span>
                        <span className="flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                          <XCircle size={10} /> {skillGaps.length} gap{skillGaps.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Verdict */}
                      <div className="px-4 pb-3">
                        <VerdictBadge verdict={verdict} />
                      </div>

                      {/* Actions */}
                      <div className="mt-auto px-4 pb-4 flex gap-2 border-t border-border pt-3">
                        <Link href={`/resumes/${resume.id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                            <FileText size={12} className="mr-1" /> View Profile
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          onClick={() => setSingleDialog({ open: true, resumeId: resume.id, candidateName: resume.candidateName ?? undefined })}
                          title="Download candidate report"
                        >
                          <Download size={13} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Batch download dialog */}
      <BatchDownloadDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        jobId={job.id}
        jobTitle={job.title}
        jobRefNumber={job.jobRefNumber}
        resumeIds={ranked.map(r => r.id)}
      />

      {/* Single candidate download dialog */}
      <SingleDownloadDialog
        open={singleDialog.open}
        onOpenChange={open => setSingleDialog(s => ({ ...s, open }))}
        resumeId={singleDialog.resumeId}
        candidateName={singleDialog.candidateName}
      />
    </>
  );
}

/* ─── Helpers ─── */
function getVerdict(score: number): "strong" | "good" | "weak" {
  if (score >= 70) return "strong";
  if (score >= 45) return "good";
  return "weak";
}

function VerdictBadge({ verdict }: { verdict: "strong" | "good" | "weak" }) {
  const map = {
    strong: { label: "Highly Recommended", icon: <ShieldCheck size={11} className="mr-1" />, cls: "bg-green-100 text-green-800 border-green-200" },
    good: { label: "Recommended", icon: <TrendingUp size={11} className="mr-1" />, cls: "bg-blue-100 text-blue-800 border-blue-200" },
    weak: { label: "Not Recommended", icon: <AlertTriangle size={11} className="mr-1" />, cls: "bg-red-100 text-red-800 border-red-200" },
  };
  const { label, icon, cls } = map[verdict];
  return (
    <span className={clsx("inline-flex items-center text-xs font-bold border rounded-full px-2.5 py-0.5 w-full justify-center", cls)}>
      {icon}{label}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const colors = ["bg-amber-100 text-amber-800 border-amber-300", "bg-slate-200 text-slate-700 border-slate-300", "bg-orange-100 text-orange-800 border-orange-300"];
  const icons = [<Trophy key="t" size={10} />, <Star key="s" size={10} />, null];
  const cls = colors[rank - 1] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={clsx("inline-flex items-center gap-0.5 justify-center w-6 h-6 rounded-full border text-xs font-bold shrink-0", cls)}>
      {rank <= 3 ? icons[rank - 1] : null}{rank <= 3 ? "" : rank}
    </span>
  );
}

function ScoreBlock({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? "text-green-700" : score >= 40 ? "text-amber-700" : "text-red-700";
  const barColor = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="bg-white border border-border rounded-lg p-2.5 text-center">
      <div className={clsx("text-lg font-bold", color)}>{score.toFixed(0)}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full", barColor)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
