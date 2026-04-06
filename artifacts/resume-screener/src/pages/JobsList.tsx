import { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { useDropzone } from "react-dropzone";
import {
  useJobsData, useDeleteJobMutation, useUpdateJobStatusMutation,
  useCreateJobMutation, useUpdateJobMutation
} from "@/hooks/use-jobs";
import { useJobResumes, useUploadResumesMutation, useScreenBatchMutation, useRescreenAllMutation } from "@/hooks/use-resumes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { clsx } from "clsx";
import {
  Plus, Search, Briefcase, Trash2, ArrowRight, Pencil,
  CheckCircle2, RotateCcw, Archive, UploadCloud, X, File,
  ChevronDown, ChevronUp, PlayCircle, Loader2, CheckCircle,
  AlertCircle, Save, FileCheck
} from "lucide-react";

type Job = ReturnType<typeof useJobsData>["data"] extends (infer T)[] | undefined ? T : never;

interface FormState {
  jobRefNumber: string;
  title: string;
  department: string;
  description: string;
  skillsInput: string;
  experienceRequired: string;
  educationRequired: string;
}
const EMPTY_FORM: FormState = {
  jobRefNumber: "", title: "", department: "", description: "",
  skillsInput: "", experienceRequired: "", educationRequired: "",
};

export function JobsList() {
  const { data: jobs = [], isLoading } = useJobsData();
  const deleteMutation = useDeleteJobMutation();
  const createMutation = useCreateJobMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Panel state: null = closed, "new" = creating, job.id = editing
  const [panelMode, setPanelMode] = useState<null | "new" | string>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Which job card has the upload zone expanded
  const [uploadExpandedJob, setUploadExpandedJob] = useState<string | null>(null);

  // Re-evaluate dialog: holds job id after a successful edit save
  const [rescreenJobId, setRescreenJobId] = useState<string | null>(null);
  const rescreenMutation = useRescreenAllMutation(rescreenJobId ?? "");

  const editingJob = typeof panelMode === "string" && panelMode !== "new"
    ? jobs.find(j => j.id === panelMode)
    : undefined;

  const updateMutation = useUpdateJobMutation(editingJob?.id ?? "");

  // Open edit panel: pre-fill form
  const openEdit = (job: Job) => {
    setForm({
      jobRefNumber: job.jobRefNumber ?? "",
      title: job.title ?? "",
      department: job.department ?? "",
      description: job.description ?? "",
      skillsInput: (job.requiredSkills ?? []).join(", "),
      experienceRequired: job.experienceRequired ?? "",
      educationRequired: job.educationRequired ?? "",
    });
    setPanelMode(job.id);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setPanelMode("new");
  };

  const closePanel = () => {
    setPanelMode(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredSkills = form.skillsInput.split(",").map(s => s.trim()).filter(Boolean);
    const payload = {
      jobRefNumber: form.jobRefNumber, title: form.title, department: form.department,
      description: form.description, requiredSkills,
      experienceRequired: form.experienceRequired, educationRequired: form.educationRequired,
    };
    if (panelMode === "new") {
      createMutation.mutate({ data: payload }, { onSuccess: closePanel });
    } else {
      const editedJobId = panelMode as string;
      updateMutation.mutate(payload as Parameters<typeof updateMutation.mutate>[0], {
        onSuccess: () => {
          closePanel();
          const job = jobs.find(j => j.id === editedJobId);
          if ((job?.screenedCount ?? 0) > 0) {
            setRescreenJobId(editedJobId);
          }
        }
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.jobRefNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const activeJobs = filtered.filter(j => j.status !== "completed");
  const completedJobs = filtered.filter(j => j.status === "completed");

  return (
    <div className="flex gap-0 h-full -m-6 sm:-m-8 overflow-hidden">

      {/* ── MAIN AREA ── */}
      <div className={clsx(
        "flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 transition-all duration-300",
        panelMode ? "lg:mr-[420px]" : ""
      )}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Job Profiles</h1>
            <p className="text-muted-foreground mt-1">Manage postings, upload resumes, and screen candidates</p>
          </div>
          <Link href="/jobs/new">
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-11 px-6">
              <Plus className="mr-2 h-4 w-4" /> Create Profile
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search by title or reference number…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          </div>
        ) : (
          <>
            {/* Active jobs */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Active Profiles ({activeJobs.length})
              </p>
              {activeJobs.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
                    <Briefcase className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="font-bold">No active profiles</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {searchTerm ? "Try a different search." : "Click \"Create Profile\" to add your first job."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {activeJobs.map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onEdit={() => openEdit(job)}
                      onDelete={() => setJobToDelete(job.id)}
                      uploadExpanded={uploadExpandedJob === job.id}
                      onToggleUpload={() => setUploadExpandedJob(prev => prev === job.id ? null : job.id)}
                      isActivePanel={panelMode === job.id}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Completed jobs */}
            {completedJobs.length > 0 && (
              <section>
                <button
                  onClick={() => setShowCompleted(v => !v)}
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Archive size={13} /> Completed / Archived ({completedJobs.length})
                  <span className="normal-case font-normal">{showCompleted ? "— hide" : "— show"}</span>
                </button>
                {showCompleted && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {completedJobs.map(job => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onEdit={() => openEdit(job)}
                        onDelete={() => setJobToDelete(job.id)}
                        uploadExpanded={uploadExpandedJob === job.id}
                        onToggleUpload={() => setUploadExpandedJob(prev => prev === job.id ? null : job.id)}
                        isActivePanel={panelMode === job.id}
                        dimmed
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* ── SIDE PANEL: Create / Edit Form ── */}
      <div className={clsx(
        "fixed right-0 top-0 bottom-0 w-full max-w-[420px] bg-card border-l border-border shadow-2xl z-30 flex flex-col transition-transform duration-300",
        panelMode ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-slate-50">
          <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
            {panelMode === "new"
              ? <><Plus size={18} className="text-primary" /> New Job Profile</>
              : <><Pencil size={18} className="text-primary" /> Edit Profile</>
            }
          </h2>
          <button onClick={closePanel} className="p-1.5 rounded-lg text-muted-foreground hover:bg-slate-200 hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Panel Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Reference No. <span className="text-destructive">*</span>
                </label>
                <input
                  name="jobRefNumber"
                  value={form.jobRefNumber}
                  onChange={handleChange}
                  required
                  disabled={panelMode !== "new"}
                  placeholder="e.g. REQ-001"
                  className="field-input text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {panelMode !== "new" && (
                  <p className="text-xs text-muted-foreground">Cannot change after creation</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Department</label>
                <input
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="e.g. Finance"
                  className="field-input text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Job Title <span className="text-destructive">*</span>
              </label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                placeholder="e.g. Senior Finance Controller"
                className="field-input text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Job Description <span className="text-destructive">*</span>
              </label>
              <p className="text-xs text-muted-foreground">The AI uses this to evaluate every resume — be detailed.</p>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={7}
                placeholder="Paste the full job description including responsibilities, requirements, context…"
                className="field-input text-sm resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Required Skills</label>
              <p className="text-xs text-muted-foreground">Comma-separated. AI will check resumes against these specifically.</p>
              <input
                name="skillsInput"
                value={form.skillsInput}
                onChange={handleChange}
                placeholder="e.g. IFRS, SAP, FP&A, Excel"
                className="field-input text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Experience Required</label>
                <input
                  name="experienceRequired"
                  value={form.experienceRequired}
                  onChange={handleChange}
                  placeholder="e.g. 8+ years in senior finance roles"
                  className="field-input text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Education Required</label>
                <input
                  name="educationRequired"
                  value={form.educationRequired}
                  onChange={handleChange}
                  placeholder="e.g. CA / MBA Finance / CFA"
                  className="field-input text-sm"
                />
              </div>
            </div>
          </div>

          {/* Panel Footer */}
          <div className="sticky bottom-0 px-6 py-4 border-t border-border bg-card flex gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={closePanel} className="flex-1 h-10" disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white">
              {isPending
                ? <><Loader2 size={15} className="mr-2 animate-spin" /> Saving…</>
                : <><Save size={15} className="mr-2" />{panelMode === "new" ? "Create Profile" : "Save Changes"}</>
              }
            </Button>
          </div>
        </form>
      </div>

      {/* Backdrop for mobile */}
      {panelMode && (
        <div className="fixed inset-0 bg-black/20 z-20 lg:hidden" onClick={closePanel} />
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!jobToDelete} onOpenChange={open => !open && setJobToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the profile and ALL associated resumes and reports. Consider marking as Completed to archive it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => jobToDelete && deleteMutation.mutate({ jobId: jobToDelete })}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Re-evaluate dialog — shown after editing a job that already has screened resumes */}
      <AlertDialog open={!!rescreenJobId} onOpenChange={open => !open && setRescreenJobId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw size={18} className="text-primary" />
              Re-evaluate screened resumes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The job profile has been updated. Would you like to re-evaluate all previously screened resumes against the new requirements? This will re-run AI scoring for every resume on this profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRescreenJobId(null)}>Skip</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => {
                if (rescreenJobId) {
                  rescreenMutation.mutate(rescreenJobId);
                }
                setRescreenJobId(null);
              }}
            >
              Re-evaluate Resumes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─────────────── JOB CARD ─────────────── */
function JobCard({
  job, onEdit, onDelete, uploadExpanded, onToggleUpload, isActivePanel, dimmed
}: {
  job: Job;
  onEdit: () => void;
  onDelete: () => void;
  uploadExpanded: boolean;
  onToggleUpload: () => void;
  isActivePanel: boolean;
  dimmed?: boolean;
}) {
  const statusMutation = useUpdateJobStatusMutation(job.id);

  return (
    <div className={clsx(
      "bg-card rounded-2xl border shadow-sm transition-shadow flex flex-col overflow-hidden",
      isActivePanel ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border hover:shadow-md",
      dimmed && "opacity-60"
    )}>
      {/* Card top */}
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-bold font-mono text-slate-700">
              {job.jobRefNumber}
            </span>
            {job.status === "completed" && (
              <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-xs hover:bg-slate-100 gap-1">
                <Archive size={9} /> Completed
              </Badge>
            )}
          </div>
          {/* Action buttons */}
          <div className="flex gap-1 shrink-0">
            <button
              onClick={onEdit}
              title="Edit profile"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Pencil size={14} />
            </button>
            {job.status !== "completed" ? (
              <button
                onClick={() => statusMutation.mutate("completed")}
                disabled={statusMutation.isPending}
                title="Mark as completed"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40"
              >
                <CheckCircle2 size={14} />
              </button>
            ) : (
              <button
                onClick={() => statusMutation.mutate("active")}
                disabled={statusMutation.isPending}
                title="Re-activate"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40"
              >
                <RotateCcw size={14} />
              </button>
            )}
            <button
              onClick={onDelete}
              title="Delete profile"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <Link href={`/jobs/${job.id}`}>
          <h3 className="font-bold text-lg text-foreground hover:text-primary transition-colors line-clamp-2 leading-tight mb-1">
            {job.title}
          </h3>
        </Link>
        {job.department && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
            <Briefcase size={13} /> {job.department}
          </p>
        )}

        {/* Stats */}
        <div className="flex gap-4 py-3 border-t border-border">
          <div className="text-center">
            <div className="text-xl font-bold text-foreground">{job.resumeCount}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Uploaded</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{job.screenedCount}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Screened</div>
          </div>
        </div>
      </div>

      {/* Card actions */}
      <div className="px-5 pb-5 grid grid-cols-2 gap-2">
        <Link href={`/jobs/${job.id}`}>
          <Button variant="outline" className="w-full h-9 text-sm gap-2">
            View Candidates <ArrowRight size={13} />
          </Button>
        </Link>
        <Button
          variant={uploadExpanded ? "default" : "outline"}
          className={clsx("h-9 text-sm gap-2 w-full", uploadExpanded && "bg-primary text-white")}
          onClick={onToggleUpload}
        >
          <UploadCloud size={14} />
          Upload
          {uploadExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </Button>
      </div>

      {/* Expandable Upload Zone */}
      {uploadExpanded && <UploadZone jobId={job.id} />}
    </div>
  );
}

/* ─────────────── INLINE UPLOAD ZONE ─────────────── */
function UploadZone({ jobId }: { jobId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const uploadMutation = useUploadResumesMutation(jobId);
  const screenBatch = useScreenBatchMutation(jobId);
  const { data: resumes = [], isLoading } = useJobResumes(jobId);

  const pendingCount = resumes.filter(r => r.status === "pending" || r.status === "failed").length;

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

  return (
    <div className="border-t border-border bg-slate-50 p-5 space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upload Resumes</p>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-white"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud size={24} className={clsx("mb-2", isDragActive ? "text-primary" : "text-slate-400")} />
        <p className="text-sm font-semibold text-foreground">
          {isDragActive ? "Drop files here…" : "Drag & drop resumes"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">PDF, DOCX, TXT — max 20 MB each</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-foreground">
            <span>{files.length} file{files.length !== 1 ? "s" : ""} ready</span>
            <button className="text-primary hover:underline" onClick={() => setFiles([])}>Clear all</button>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-white border border-border rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <File size={12} className="text-slate-400 shrink-0" />
                  <span className="text-xs truncate">{f.name}</span>
                </div>
                <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-slate-400 hover:text-destructive ml-2 shrink-0">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      <Button
        onClick={handleUpload}
        disabled={files.length === 0 || uploadMutation.isPending}
        className="w-full bg-primary hover:bg-primary/90 h-9 text-sm"
      >
        {uploadMutation.isPending
          ? <><Loader2 size={14} className="mr-2 animate-spin" /> Uploading…</>
          : <><UploadCloud size={14} className="mr-2" /> Upload {files.length > 0 ? `${files.length} File${files.length !== 1 ? "s" : ""}` : "Files"}</>
        }
      </Button>

      {/* Screen button + queue summary */}
      {resumes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              {resumes.length} total · {resumes.filter(r => r.status === "screened").length} screened · {pendingCount} pending
            </span>
            <Button
              size="sm"
              onClick={() => screenBatch.mutate({ jobId })}
              disabled={pendingCount === 0 || screenBatch.isPending}
              className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {screenBatch.isPending
                ? <><Loader2 size={11} className="mr-1.5 animate-spin" /> Screening…</>
                : <><PlayCircle size={11} className="mr-1.5" /> Screen All ({pendingCount})</>
              }
            </Button>
          </div>

          {/* Mini queue */}
          {isLoading ? (
            <div className="space-y-1">{[1, 2].map(i => <Skeleton key={i} className="h-7 rounded-lg" />)}</div>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {resumes.slice(0, 8).map(r => (
                <div key={r.id} className="flex items-center justify-between bg-white border border-border rounded-lg px-3 py-1.5">
                  <span className="text-xs truncate text-foreground max-w-[60%]">{r.candidateName || r.fileName}</span>
                  <MiniStatusBadge status={r.status} />
                </div>
              ))}
              {resumes.length > 8 && (
                <p className="text-xs text-center text-muted-foreground pt-1">+{resumes.length - 8} more — open profile to see all</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    screened:   { label: "Screened",   cls: "bg-green-100 text-green-800 border-green-200",   icon: <CheckCircle size={9} /> },
    processing: { label: "Processing", cls: "bg-blue-100 text-blue-800 border-blue-200",     icon: <Loader2 size={9} className="animate-spin" /> },
    failed:     { label: "Failed",     cls: "bg-red-100 text-red-800 border-red-200",         icon: <AlertCircle size={9} /> },
    unreadable: { label: "Unreadable", cls: "bg-amber-100 text-amber-800 border-amber-200",   icon: <AlertCircle size={9} /> },
    pending:    { label: "Pending",    cls: "bg-slate-100 text-slate-600 border-slate-200",   icon: <FileCheck size={9} /> },
  };
  const cfg = map[status] ?? map.pending;
  return (
    <span className={clsx("inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border", cfg.cls)}>
      {cfg.icon} {cfg.label}
    </span>
  );
}
