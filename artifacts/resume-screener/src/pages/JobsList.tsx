import { useState } from "react";
import { Link } from "wouter";
import { useJobsData, useDeleteJobMutation, useUpdateJobStatusMutation } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, Briefcase, Trash2, ArrowRight, Pencil,
  CheckCircle2, RotateCcw, Archive
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function JobsList() {
  const { data: jobs = [], isLoading } = useJobsData();
  const deleteMutation = useDeleteJobMutation();
  const [searchTerm, setSearchTerm] = useState("");
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.jobRefNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeJobs = filtered.filter(j => j.status !== "completed");
  const completedJobs = filtered.filter(j => j.status === "completed");

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Job Profiles</h1>
          <p className="text-muted-foreground mt-1">Manage job postings and screen candidates against them</p>
        </div>
        <Link href="/jobs/new">
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-11 px-6">
            <Plus className="mr-2 h-4 w-4" /> New Job Profile
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
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Active jobs */}
          <section>
            <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Active Profiles ({activeJobs.length})
            </h2>
            {activeJobs.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
                  <Briefcase className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold">No active jobs</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {searchTerm ? "Try a different search." : "Create your first job profile to start screening candidates."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeJobs.map(job => <JobCard key={job.id} job={job} onDelete={() => setJobToDelete(job.id)} />)}
              </div>
            )}
          </section>

          {/* Completed jobs */}
          {completedJobs.length > 0 && (
            <section>
              <button
                onClick={() => setShowCompleted(v => !v)}
                className="flex items-center gap-2 text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4 hover:text-foreground transition-colors"
              >
                <Archive size={15} /> Completed / Archived ({completedJobs.length})
                <span className="text-xs normal-case font-normal ml-1">{showCompleted ? "— hide" : "— show"}</span>
              </button>
              {showCompleted && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {completedJobs.map(job => <JobCard key={job.id} job={job} onDelete={() => setJobToDelete(job.id)} dimmed />)}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!jobToDelete} onOpenChange={open => !open && setJobToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the job profile and ALL associated resumes and reports. Consider marking as Completed instead if you want to archive it.
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
    </div>
  );
}

function JobCard({ job, onDelete, dimmed }: { job: ReturnType<typeof useJobsData>["data"] extends (infer T)[] ? T : never; onDelete: () => void; dimmed?: boolean }) {
  const statusMutation = useUpdateJobStatusMutation(job.id);

  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col group relative overflow-hidden ${dimmed ? "opacity-60" : ""}`}>
      {/* Actions row */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Link href={`/jobs/${job.id}/edit`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" title="Edit">
            <Pencil size={15} />
          </Button>
        </Link>
        {job.status !== "completed" ? (
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-green-700 hover:bg-green-50"
            title="Mark as Completed"
            onClick={() => statusMutation.mutate("completed")}
            disabled={statusMutation.isPending}
          >
            <CheckCircle2 size={15} />
          </Button>
        ) : (
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-blue-700 hover:bg-blue-50"
            title="Re-activate"
            onClick={() => statusMutation.mutate("active")}
            disabled={statusMutation.isPending}
          >
            <RotateCcw size={15} />
          </Button>
        )}
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Delete"
          onClick={onDelete}
        >
          <Trash2 size={15} />
        </Button>
      </div>

      <div className="mb-4 pr-10">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-bold font-mono text-slate-700">
            {job.jobRefNumber}
          </span>
          {job.status === "completed" && (
            <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-xs hover:bg-slate-100">
              <Archive size={10} className="mr-1" /> Completed
            </Badge>
          )}
        </div>
        <Link href={`/jobs/${job.id}`}>
          <h3 className="font-bold text-lg text-foreground hover:text-primary transition-colors line-clamp-2 leading-tight">
            {job.title}
          </h3>
        </Link>
        {job.department && (
          <p className="text-sm text-muted-foreground flex items-center mt-1.5 gap-1.5">
            <Briefcase size={13} /> {job.department}
          </p>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-border">
        <div className="flex justify-between items-end mb-4">
          <div className="text-center">
            <div className="text-xl font-bold text-foreground">{job.resumeCount}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Uploaded</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{job.screenedCount}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Screened</div>
          </div>
        </div>
        <Link href={`/jobs/${job.id}`}>
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-primary hover:text-white transition-colors text-sm h-9 group">
            Open Profile <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
