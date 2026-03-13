import { useState } from "react";
import { useParams, Link } from "wouter";
import { useJobData } from "@/hooks/use-jobs";
import { useJobResumes, useDeleteResumeMutation, useScreenResumeMutation, useScreenBatchMutation } from "@/hooks/use-resumes";
import { getDownloadBatchReportUrl } from "@workspace/api-client-react";
import { UploadModal } from "@/components/UploadModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, UploadCloud, PlayCircle, Download, FileText, 
  Trash2, User, RefreshCw, Loader2, AlertCircle, FileCheck
} from "lucide-react";
import { format } from "date-fns";

export function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  const { data: job, isLoading: jobLoading } = useJobData(jobId);
  const { data: resumes = [], isLoading: resumesLoading } = useJobResumes(jobId);
  
  const screenBatch = useScreenBatchMutation(jobId);
  const deleteResume = useDeleteResumeMutation(jobId);
  const screenResume = useScreenResumeMutation(jobId);

  const pendingCount = resumes.filter(r => r.status === 'pending' || r.status === 'processing').length;
  
  const handleDownloadBatch = () => {
    // Generate URL and open in new tab to trigger download
    const url = getDownloadBatchReportUrl(jobId);
    window.open(url, '_blank');
  };

  if (jobLoading) {
    return <div className="space-y-6"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>;
  }

  if (!job) {
    return <div className="p-10 text-center text-lg font-bold">Job not found.</div>;
  }

  return (
    <div className="space-y-8 pb-10">
      <Link href="/jobs" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back to Jobs
      </Link>
      
      {/* Job Header Card */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold font-mono border border-slate-200">
                  {job.jobRefNumber}
                </span>
                <Badge variant="outline" className="bg-white">{job.department || 'General'}</Badge>
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-4">{job.title}</h1>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {(job.requiredSkills || []).map(skill => (
                  <Badge key={skill} variant="secondary" className="bg-slate-100 text-slate-700 font-medium">{skill}</Badge>
                ))}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 shrink-0">
              <Button onClick={() => setIsUploadOpen(true)} className="bg-primary hover:bg-primary/90 h-10 shadow-md">
                <UploadCloud size={18} className="mr-2" /> Upload Resumes
              </Button>
              <Button 
                onClick={() => screenBatch.mutate({ jobId })}
                disabled={pendingCount === 0 || screenBatch.isPending}
                variant="outline" 
                className="h-10 bg-white shadow-sm border-border hover:bg-slate-50"
              >
                <PlayCircle size={18} className="mr-2" /> Screen Batch ({pendingCount})
              </Button>
              <Button 
                onClick={handleDownloadBatch}
                disabled={resumes.length === 0}
                variant="outline"
                className="h-10 bg-white shadow-sm border-border hover:bg-slate-50"
              >
                <Download size={18} className="mr-2" /> CSV Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Resumes List */}
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <Users className="text-primary" size={20} />
          Candidates ({resumes.length})
        </h2>

        {resumesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : resumes.length > 0 ? (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-2xl">Candidate</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">ATS Score</th>
                    <th className="px-6 py-4 text-center">Suitability</th>
                    <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {resumes.map(resume => (
                    <tr key={resume.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            {resume.status === 'screened' ? (
                              <span className="font-bold text-slate-600">
                                {resume.candidateName ? resume.candidateName.charAt(0).toUpperCase() : <User size={18} />}
                              </span>
                            ) : (
                              <FileText size={18} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-foreground truncate max-w-[200px]">
                              {resume.candidateName || resume.fileName}
                            </div>
                            {resume.candidateEmail && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {resume.candidateEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={resume.status} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        {resume.status === 'screened' && resume.atsScore !== undefined ? (
                          <ScoreBadge score={resume.atsScore} />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {resume.status === 'screened' && resume.suitabilityScore !== undefined ? (
                          <ScoreBadge score={resume.suitabilityScore} />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {resume.status === 'screened' && (
                            <Link href={`/resumes/${resume.id}`}>
                              <Button size="sm" variant="outline" className="h-8 shadow-sm">View Report</Button>
                            </Link>
                          )}
                          {(resume.status === 'failed' || resume.status === 'pending') && (
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-8 w-8 text-primary"
                              onClick={() => screenResume.mutate({ resumeId: resume.id })}
                              disabled={screenResume.isPending}
                            >
                              <RefreshCw size={14} className={screenResume.isPending ? "animate-spin" : ""} />
                            </Button>
                          )}
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm('Delete this resume?')) {
                                deleteResume.mutate({ resumeId: resume.id });
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-card rounded-2xl border border-border border-dashed">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <UploadCloud className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold">No resumes uploaded</h3>
            <p className="text-muted-foreground mt-2 mb-6 max-w-sm mx-auto">
              Upload candidate resumes (PDF, DOCX, TXT) to begin the AI screening process.
            </p>
            <Button onClick={() => setIsUploadOpen(true)} className="bg-primary">
              Upload Resumes
            </Button>
          </div>
        )}
      </div>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        jobId={jobId} 
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'screened': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border border-green-200"><CheckCircle size={12} className="mr-1" /> Screened</Badge>;
    case 'processing': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-200"><Loader2 size={12} className="mr-1 animate-spin" /> Processing</Badge>;
    case 'failed': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-200"><AlertCircle size={12} className="mr-1" /> Failed</Badge>;
    default: return <Badge variant="secondary" className="bg-slate-100 text-slate-600 border border-slate-200"><FileCheck size={12} className="mr-1" /> Pending</Badge>;
  }
}

function ScoreBadge({ score }: { score: number }) {
  let color = "bg-red-100 text-red-800 border-red-200";
  if (score >= 70) color = "bg-green-100 text-green-800 border-green-200";
  else if (score >= 40) color = "bg-yellow-100 text-yellow-800 border-yellow-200";
  
  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full border ${color}`}>
      {score.toFixed(0)}
    </span>
  );
}
