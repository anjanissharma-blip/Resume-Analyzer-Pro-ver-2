import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useJobsData } from "@/hooks/use-jobs";
import { useJobResumes, useUploadResumesMutation, useScreenBatchMutation, useScreenResumeMutation } from "@/hooks/use-resumes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { clsx } from "clsx";
import {
  UploadCloud, X, File, PlayCircle, Loader2, CheckCircle,
  AlertCircle, FileCheck, ChevronDown, FileText, RefreshCw
} from "lucide-react";

export function UploadPage() {
  const { data: jobs = [], isLoading: jobsLoading } = useJobsData();
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);

  const uploadMutation = useUploadResumesMutation(selectedJobId);
  const screenBatch = useScreenBatchMutation(selectedJobId);
  const screenResume = useScreenResumeMutation(selectedJobId);
  const { data: resumes = [], isLoading: resumesLoading } = useJobResumes(selectedJobId, { enabled: !!selectedJobId });

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const pendingCount = resumes.filter(r => r.status === "pending" || r.status === "failed").length;
  const screenedCount = resumes.filter(r => r.status === "screened").length;

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
    if (!selectedJobId || files.length === 0) return;
    uploadMutation.mutate({ data: { jobId: selectedJobId, files } }, {
      onSuccess: () => setFiles([]),
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Resume Upload</h1>
        <p className="text-muted-foreground mt-1">Select a job reference, upload candidate resumes, and run AI screening.</p>
      </div>

      {/* Job selector */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <label className="block text-sm font-semibold text-foreground mb-3">
          Select Job Reference <span className="text-destructive">*</span>
        </label>
        {jobsLoading ? (
          <Skeleton className="h-12 rounded-xl w-full" />
        ) : jobs.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            No jobs found. Create a job profile first before uploading resumes.
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedJobId}
              onChange={e => { setSelectedJobId(e.target.value); setFiles([]); }}
              className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
            >
              <option value="">— Choose a job reference —</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>
                  [{job.jobRefNumber}] {job.title} {job.department ? `· ${job.department}` : ""}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {selectedJob && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-700">
              {selectedJob.jobRefNumber}
            </span>
            <span className="text-sm font-semibold text-foreground">{selectedJob.title}</span>
            {selectedJob.department && <Badge variant="outline" className="text-xs">{selectedJob.department}</Badge>}
            <span className="text-xs text-muted-foreground ml-auto">{resumes.length} resume{resumes.length !== 1 ? "s" : ""} uploaded</span>
          </div>
        )}
      </div>

      {selectedJobId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload panel */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <UploadCloud size={17} className="text-primary" /> Upload Files
              </h2>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or TXT — max 20 MB each</p>
            </div>
            <div className="p-5 space-y-4">
              <div
                {...getRootProps()}
                className={clsx(
                  "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
                  isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-slate-50"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                  <UploadCloud size={28} />
                </div>
                <p className="font-semibold text-foreground mb-1">{isDragActive ? "Drop files here…" : "Drag & drop resumes"}</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>

              {files.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <div className="flex justify-between text-xs font-semibold text-foreground mb-2">
                    <span>{files.length} file{files.length !== 1 ? "s" : ""} selected</span>
                    <button className="text-primary hover:underline" onClick={() => setFiles([])}>Clear all</button>
                  </div>
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 border border-border rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 overflow-hidden min-w-0">
                        <File size={13} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-medium truncate">{f.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-slate-400 hover:text-destructive ml-2 shrink-0">
                        <X size={13} />
                      </button>
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
                  ? <><Loader2 size={15} className="mr-2 animate-spin" /> Uploading…</>
                  : <><UploadCloud size={15} className="mr-2" /> Upload {files.length > 0 ? `${files.length} File${files.length > 1 ? "s" : ""}` : "Files"}</>
                }
              </Button>
            </div>
          </div>

          {/* Screen panel */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <PlayCircle size={17} className="text-primary" /> AI Screening
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Evaluate resumes with our AI</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Total", value: resumes.length, cls: "bg-slate-50 border-slate-200 text-slate-700" },
                  { label: "Pending", value: pendingCount, cls: "bg-amber-50 border-amber-200 text-amber-700" },
                  { label: "Screened", value: screenedCount, cls: "bg-green-50 border-green-200 text-green-700" },
                ].map(s => (
                  <div key={s.label} className={clsx("border rounded-xl p-3 text-center", s.cls)}>
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-xs font-medium uppercase tracking-wide">{s.label}</div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => screenBatch.mutate({ jobId: selectedJobId })}
                disabled={pendingCount === 0 || screenBatch.isPending}
                className="w-full bg-primary hover:bg-primary/90 h-10"
              >
                {screenBatch.isPending
                  ? <><Loader2 size={15} className="mr-2 animate-spin" /> Screening…</>
                  : <><PlayCircle size={15} className="mr-2" /> Screen All Pending ({pendingCount})</>
                }
              </Button>

              {/* Queue */}
              {resumesLoading ? (
                <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
              ) : resumes.length > 0 ? (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">All Resumes</p>
                  {resumes.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-slate-50 border border-border rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 overflow-hidden min-w-0">
                        <FileText size={13} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-medium truncate">{r.candidateName || r.fileName}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={r.status} />
                        {(r.status === "failed" || r.status === "pending") && (
                          <button
                            onClick={() => screenResume.mutate({ resumeId: r.id })}
                            disabled={screenResume.isPending}
                            className="text-primary hover:text-primary/80 disabled:opacity-50"
                            title="Retry"
                          >
                            <RefreshCw size={13} className={screenResume.isPending ? "animate-spin" : ""} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground italic">
                  No resumes uploaded for this job yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedJobId && jobs.length > 0 && (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <UploadCloud className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Select a job to get started</h3>
          <p className="text-muted-foreground mt-1 text-sm max-w-xs mx-auto">
            Choose a job reference above to upload resumes and run AI screening.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "screened": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border border-green-200 text-xs py-0"><CheckCircle size={9} className="mr-0.5" />Screened</Badge>;
    case "processing": return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-200 text-xs py-0"><Loader2 size={9} className="mr-0.5 animate-spin" />Processing</Badge>;
    case "failed": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-200 text-xs py-0"><AlertCircle size={9} className="mr-0.5" />Failed</Badge>;
    default: return <Badge variant="secondary" className="bg-slate-100 text-slate-600 border border-slate-200 text-xs py-0"><FileCheck size={9} className="mr-0.5" />Pending</Badge>;
  }
}
