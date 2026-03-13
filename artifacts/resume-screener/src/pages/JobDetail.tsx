import { useState, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { useJobData } from "@/hooks/use-jobs";
import { useJobResumes, useDeleteResumeMutation, useScreenResumeMutation, useScreenBatchMutation, useUploadResumesMutation } from "@/hooks/use-resumes";
import { getDownloadBatchReportUrl, getDownloadResumeReportUrl } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { clsx } from "clsx";
import {
  ArrowLeft, UploadCloud, PlayCircle, Download, FileText,
  Trash2, User, Users, RefreshCw, Loader2, AlertCircle,
  FileCheck, CheckCircle, Trophy, Star, FileDown, LayoutList,
  X, File, ChevronRight, TrendingUp, AlertTriangle, ShieldCheck,
  BarChart3
} from "lucide-react";

type Tab = "candidates" | "upload" | "reports";

export function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("candidates");

  const { data: job, isLoading: jobLoading } = useJobData(jobId);
  const { data: resumes = [], isLoading: resumesLoading } = useJobResumes(jobId);

  const screenBatch = useScreenBatchMutation(jobId);
  const deleteResume = useDeleteResumeMutation(jobId);
  const screenResume = useScreenResumeMutation(jobId);
  const uploadMutation = useUploadResumesMutation(jobId);

  const pendingCount = resumes.filter(r => r.status === "pending" || r.status === "processing").length;
  const screenedResumes = resumes.filter(r => r.status === "screened");

  // Ranked resumes sorted by composite score
  const rankedResumes = [...screenedResumes].sort((a, b) => {
    const scoreA = ((a.atsScore ?? 0) + (a.suitabilityScore ?? 0)) / 2;
    const scoreB = ((b.atsScore ?? 0) + (b.suitabilityScore ?? 0)) / 2;
    return scoreB - scoreA;
  });

  if (jobLoading) {
    return <div className="space-y-6"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>;
  }

  if (!job) {
    return <div className="p-10 text-center text-lg font-bold">Job not found.</div>;
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "candidates", label: "Candidates", icon: <Users size={16} />, count: resumes.length },
    { id: "upload", label: "Upload & Screen", icon: <UploadCloud size={16} />, count: pendingCount || undefined },
    { id: "reports", label: "Reports", icon: <BarChart3 size={16} />, count: screenedResumes.length || undefined },
  ];

  return (
    <div className="space-y-6 pb-10">
      <Link href="/jobs" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back to Jobs
      </Link>

      {/* Job Header Card */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold font-mono border border-slate-200">
                {job.jobRefNumber}
              </span>
              <Badge variant="outline" className="bg-white">{job.department || "General"}</Badge>
              <Badge className={job.status === "active" ? "bg-green-100 text-green-800 border border-green-200 hover:bg-green-100" : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100"}>
                {job.status === "active" ? "Active" : "Closed"}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">{job.title}</h1>
            <div className="flex flex-wrap gap-2">
              {(job.requiredSkills || []).map(skill => (
                <Badge key={skill} variant="secondary" className="bg-slate-100 text-slate-700 font-medium">{skill}</Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-4 shrink-0 text-center">
            <div className="bg-slate-50 border border-border rounded-xl px-5 py-3">
              <div className="text-2xl font-bold text-foreground">{resumes.length}</div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Resumes</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3">
              <div className="text-2xl font-bold text-green-700">{screenedResumes.length}</div>
              <div className="text-xs text-green-600 font-medium uppercase tracking-wide mt-0.5">Screened</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={clsx(
                "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold",
                activeTab === tab.id ? "bg-primary text-white" : "bg-slate-200 text-slate-600"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Candidates */}
      {activeTab === "candidates" && (
        <CandidatesTab
          resumes={resumes}
          rankedResumes={rankedResumes}
          resumesLoading={resumesLoading}
          jobId={jobId}
          screenResume={screenResume}
          deleteResume={deleteResume}
          onUploadClick={() => setActiveTab("upload")}
          navigate={navigate}
        />
      )}

      {/* Tab: Upload & Screen */}
      {activeTab === "upload" && (
        <UploadScreenTab
          jobId={jobId}
          uploadMutation={uploadMutation}
          screenBatch={screenBatch}
          pendingCount={pendingCount}
          resumes={resumes}
        />
      )}

      {/* Tab: Reports */}
      {activeTab === "reports" && (
        <ReportsTab
          job={job}
          rankedResumes={rankedResumes}
          allResumes={resumes}
          jobId={jobId}
          navigate={navigate}
        />
      )}
    </div>
  );
}

/* ─────────────── CANDIDATES TAB ─────────────── */
function CandidatesTab({ resumes, rankedResumes, resumesLoading, jobId, screenResume, deleteResume, onUploadClick, navigate }: {
  resumes: ReturnType<typeof useJobResumes>["data"] & object[];
  rankedResumes: typeof resumes;
  resumesLoading: boolean;
  jobId: string;
  screenResume: ReturnType<typeof useScreenResumeMutation>;
  deleteResume: ReturnType<typeof useDeleteResumeMutation>;
  onUploadClick: () => void;
  navigate: (path: string) => void;
}) {
  const pendingResumes = resumes.filter(r => r.status !== "screened");

  if (resumesLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
  }

  if (resumes.length === 0) {
    return (
      <div className="text-center py-24 bg-card rounded-2xl border border-dashed border-border">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
          <UploadCloud className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold">No resumes yet</h3>
        <p className="text-muted-foreground mt-2 mb-6 max-w-sm mx-auto">Upload candidate resumes to begin the AI screening process.</p>
        <Button onClick={onUploadClick} className="bg-primary">Upload Resumes</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ranked screened candidates */}
      {rankedResumes.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" /> Ranked Candidates
          </h2>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">Rank</th>
                    <th className="px-4 py-3 text-left">Candidate</th>
                    <th className="px-4 py-3 text-center">ATS Score</th>
                    <th className="px-4 py-3 text-center">Suitability</th>
                    <th className="px-4 py-3 text-center">Skill Match</th>
                    <th className="px-4 py-3 text-center">Skill Gaps</th>
                    <th className="px-4 py-3 text-center">Verdict</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rankedResumes.map((resume, idx) => {
                    const composite = ((resume.atsScore ?? 0) + (resume.suitabilityScore ?? 0)) / 2;
                    const verdict = getVerdict(composite);
                    return (
                      <tr key={resume.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-4 py-4 text-center">
                          <RankBadge rank={idx + 1} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {resume.candidateName ? resume.candidateName.charAt(0).toUpperCase() : <User size={16} />}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{resume.candidateName || resume.fileName}</div>
                              {resume.candidateEmail && <div className="text-xs text-muted-foreground">{resume.candidateEmail}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center"><ScorePill score={resume.atsScore ?? 0} /></td>
                        <td className="px-4 py-4 text-center"><ScorePill score={resume.suitabilityScore ?? 0} /></td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            {(resume.matchingSkills as string[] ?? []).length} matched
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            {(resume.skillGaps as string[] ?? []).length} gaps
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <VerdictBadge verdict={verdict} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/resumes/${resume.id}`)}>
                              Profile <ChevronRight size={12} className="ml-1" />
                            </Button>
                            <button
                              className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => { if (confirm("Delete this resume?")) deleteResume.mutate({ resumeId: resume.id }); }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pending / failed resumes */}
      {pendingResumes.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <FileText size={18} className="text-slate-400" /> Pending Screening ({pendingResumes.length})
          </h2>
          <div className="space-y-2">
            {pendingResumes.map(resume => (
              <div key={resume.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-3.5 group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <FileText size={15} className="text-slate-400" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm">{resume.fileName}</div>
                    <div className="text-xs text-muted-foreground">Uploaded {new Date(resume.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={resume.status} />
                  {(resume.status === "failed" || resume.status === "pending") && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => screenResume.mutate({ resumeId: resume.id })} disabled={screenResume.isPending}>
                      <RefreshCw size={12} className={clsx("mr-1", screenResume.isPending && "animate-spin")} /> Screen
                    </Button>
                  )}
                  <button
                    className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() => { if (confirm("Delete this resume?")) deleteResume.mutate({ resumeId: resume.id }); }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── UPLOAD & SCREEN TAB ─────────────── */
function UploadScreenTab({ jobId, uploadMutation, screenBatch, pendingCount, resumes }: {
  jobId: string;
  uploadMutation: ReturnType<typeof useUploadResumesMutation>;
  screenBatch: ReturnType<typeof useScreenBatchMutation>;
  pendingCount: number;
  resumes: ReturnType<typeof useJobResumes>["data"] & object[];
}) {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles(prev => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxSize: 20 * 1024 * 1024,
  });

  const handleUpload = () => {
    if (files.length === 0) return;
    uploadMutation.mutate({ data: { jobId, files } }, { onSuccess: () => setFiles([]) });
  };

  const unscreened = resumes.filter(r => r.status === "pending" || r.status === "failed");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Upload Panel */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><UploadCloud size={18} className="text-primary" /> Upload Resumes</h2>
          <p className="text-sm text-muted-foreground mt-1">Drag and drop or browse PDF, DOCX, or TXT files (max 20MB each).</p>
        </div>
        <div className="p-6 space-y-4">
          <div
            {...getRootProps()}
            className={clsx(
              "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-slate-50"
            )}
          >
            <input {...getInputProps()} />
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
              <UploadCloud size={28} />
            </div>
            <p className="font-semibold text-foreground mb-1">{isDragActive ? "Drop files here…" : "Drag & drop files"}</p>
            <p className="text-sm text-muted-foreground">or click to browse from your computer</p>
          </div>

          {files.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              <div className="flex justify-between text-xs font-semibold text-foreground mb-1">
                <span>{files.length} file(s) selected</span>
                <button className="text-primary hover:underline" onClick={() => setFiles([])}>Clear all</button>
              </div>
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 border border-border rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <File size={14} className="text-slate-400 shrink-0" />
                    <span className="text-sm truncate font-medium">{f.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-slate-400 hover:text-destructive ml-2"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploadMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 h-10"
          >
            {uploadMutation.isPending
              ? <><Loader2 size={16} className="mr-2 animate-spin" /> Uploading…</>
              : <><UploadCloud size={16} className="mr-2" /> Upload {files.length > 0 ? `${files.length} File${files.length > 1 ? "s" : ""}` : "Files"}</>
            }
          </Button>
        </div>
      </div>

      {/* Screen Panel */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><PlayCircle size={18} className="text-primary" /> AI Screening</h2>
          <p className="text-sm text-muted-foreground mt-1">Run AI analysis on pending resumes to generate ATS scores and candidate evaluations.</p>
        </div>
        <div className="p-6 space-y-4">
          {/* Status summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total", value: resumes.length, color: "bg-slate-50 border-slate-200 text-slate-700" },
              { label: "Pending", value: pendingCount, color: "bg-amber-50 border-amber-200 text-amber-700" },
              { label: "Screened", value: resumes.filter(r => r.status === "screened").length, color: "bg-green-50 border-green-200 text-green-700" },
            ].map(s => (
              <div key={s.label} className={clsx("border rounded-xl p-3 text-center", s.color)}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-medium uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 border border-border rounded-xl p-4 text-sm text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-1">How it works</p>
            Azure Document Intelligence extracts text from each resume, then Azure OpenAI parses candidate details, evaluates skills against the job description, and generates ATS scores and AI summaries.
          </div>

          <Button
            onClick={() => screenBatch.mutate({ jobId })}
            disabled={pendingCount === 0 || screenBatch.isPending}
            className="w-full bg-primary hover:bg-primary/90 h-10"
          >
            {screenBatch.isPending
              ? <><Loader2 size={16} className="mr-2 animate-spin" /> Running Batch Screen…</>
              : <><PlayCircle size={16} className="mr-2" /> Screen All Pending ({pendingCount})</>
            }
          </Button>

          {unscreened.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Awaiting Screening</p>
              {unscreened.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-slate-50 border border-border rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText size={13} className="text-slate-400 shrink-0" />
                    <span className="text-sm truncate font-medium">{r.fileName}</span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── REPORTS TAB ─────────────── */
function ReportsTab({ job, rankedResumes, allResumes, jobId, navigate }: {
  job: NonNullable<ReturnType<typeof useJobData>["data"]>;
  rankedResumes: ReturnType<typeof useJobResumes>["data"] & object[];
  allResumes: ReturnType<typeof useJobResumes>["data"] & object[];
  jobId: string;
  navigate: (path: string) => void;
}) {
  const handleBatchDownload = () => window.open(getDownloadBatchReportUrl(jobId), "_blank");
  const handleIndividualDownload = (resumeId: string) => window.open(getDownloadResumeReportUrl(resumeId), "_blank");

  if (rankedResumes.length === 0) {
    return (
      <div className="text-center py-24 bg-card rounded-2xl border border-dashed border-border">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
          <BarChart3 className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold">No screened candidates yet</h3>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Run AI screening on uploaded resumes to generate reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Batch download bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div>
          <h2 className="font-bold text-foreground flex items-center gap-2"><FileDown size={18} className="text-primary" /> Batch Report</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{rankedResumes.length} candidate{rankedResumes.length !== 1 ? "s" : ""} screened for <span className="font-semibold">{job.jobRefNumber}</span> — {job.title}</p>
        </div>
        <Button onClick={handleBatchDownload} className="bg-primary hover:bg-primary/90 shrink-0">
          <Download size={16} className="mr-2" /> Download CSV
        </Button>
      </div>

      {/* Candidate cards grid */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <LayoutList size={18} className="text-primary" /> Candidate Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rankedResumes.map((resume, idx) => {
            const composite = ((resume.atsScore ?? 0) + (resume.suitabilityScore ?? 0)) / 2;
            const verdict = getVerdict(composite);
            const matchingSkills = (resume.matchingSkills as string[] ?? []);
            const skillGaps = (resume.skillGaps as string[] ?? []);
            return (
              <div key={resume.id} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                {/* Card header */}
                <div className="p-5 pb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
                      {resume.candidateName ? resume.candidateName.charAt(0).toUpperCase() : <User size={20} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground truncate">{resume.candidateName || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground truncate">{resume.candidateEmail || resume.fileName}</div>
                    </div>
                  </div>
                  <RankBadge rank={idx + 1} />
                </div>

                {/* Scores */}
                <div className="px-5 pb-4 grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <div className={clsx("text-xl font-bold", getScoreColor(resume.atsScore ?? 0))}>{(resume.atsScore ?? 0).toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground font-medium mt-0.5">ATS Score</div>
                    <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={clsx("h-full rounded-full", getScoreBarColor(resume.atsScore ?? 0))} style={{ width: `${resume.atsScore ?? 0}%` }} />
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <div className={clsx("text-xl font-bold", getScoreColor(resume.suitabilityScore ?? 0))}>{(resume.suitabilityScore ?? 0).toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground font-medium mt-0.5">Suitability</div>
                    <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={clsx("h-full rounded-full", getScoreBarColor(resume.suitabilityScore ?? 0))} style={{ width: `${resume.suitabilityScore ?? 0}%` }} />
                    </div>
                  </div>
                </div>

                {/* Skill match / gaps pills */}
                <div className="px-5 pb-4 space-y-2">
                  {matchingSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1"><CheckCircle size={11} /> Matching Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {matchingSkills.slice(0, 4).map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium">{s}</span>
                        ))}
                        {matchingSkills.length > 4 && <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium">+{matchingSkills.length - 4}</span>}
                      </div>
                    </div>
                  )}
                  {skillGaps.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1"><AlertTriangle size={11} /> Skill Gaps</p>
                      <div className="flex flex-wrap gap-1">
                        {skillGaps.slice(0, 3).map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full font-medium">{s}</span>
                        ))}
                        {skillGaps.length > 3 && <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full font-medium">+{skillGaps.length - 3}</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Verdict */}
                <div className="px-5 pb-4">
                  <VerdictBadge verdict={verdict} full />
                </div>

                {/* Actions */}
                <div className="mt-auto px-5 pb-5 pt-2 flex gap-2 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => navigate(`/resumes/${resume.id}`)}>
                    View Profile
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs px-3" onClick={() => handleIndividualDownload(resume.id)}>
                    <Download size={13} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── HELPERS ─────────────── */
function getVerdict(score: number): "strong" | "good" | "weak" {
  if (score >= 70) return "strong";
  if (score >= 45) return "good";
  return "weak";
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-green-700";
  if (score >= 40) return "text-amber-700";
  return "text-red-700";
}

function getScoreBarColor(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-amber-400";
  return "bg-red-400";
}

function RankBadge({ rank }: { rank: number }) {
  const colors = ["bg-amber-100 text-amber-800 border-amber-300", "bg-slate-200 text-slate-700 border-slate-300", "bg-orange-100 text-orange-800 border-orange-300"];
  const icons = [<Trophy key="t" size={12} className="mr-0.5" />, <Star key="s" size={12} className="mr-0.5" />, null];
  const cls = colors[rank - 1] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={clsx("inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold shrink-0", cls)}>
      {rank <= 3 ? icons[rank - 1] : null}{rank}
    </span>
  );
}

function VerdictBadge({ verdict, full }: { verdict: "strong" | "good" | "weak"; full?: boolean }) {
  const map = {
    strong: { label: "Highly Recommended", icon: <ShieldCheck size={12} className="mr-1" />, cls: "bg-green-100 text-green-800 border-green-300" },
    good: { label: "Recommended", icon: <TrendingUp size={12} className="mr-1" />, cls: "bg-blue-100 text-blue-800 border-blue-300" },
    weak: { label: "Not Recommended", icon: <AlertTriangle size={12} className="mr-1" />, cls: "bg-red-100 text-red-800 border-red-300" },
  };
  const { label, icon, cls } = map[verdict];
  return (
    <span className={clsx("inline-flex items-center text-xs font-bold border rounded-full px-2.5 py-1", cls, full && "w-full justify-center")}>
      {icon}{label}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  let cls = "bg-red-100 text-red-800 border-red-200";
  if (score >= 70) cls = "bg-green-100 text-green-800 border-green-200";
  else if (score >= 40) cls = "bg-amber-100 text-amber-800 border-amber-200";
  return (
    <span className={clsx("inline-flex items-center justify-center w-10 h-7 text-xs font-bold rounded-full border", cls)}>
      {score.toFixed(0)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "screened": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border border-green-200 text-xs"><CheckCircle size={10} className="mr-1" />Screened</Badge>;
    case "processing": return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-200 text-xs"><Loader2 size={10} className="mr-1 animate-spin" />Processing</Badge>;
    case "failed": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-200 text-xs"><AlertCircle size={10} className="mr-1" />Failed</Badge>;
    default: return <Badge variant="secondary" className="bg-slate-100 text-slate-600 border border-slate-200 text-xs"><FileCheck size={10} className="mr-1" />Pending</Badge>;
  }
}
