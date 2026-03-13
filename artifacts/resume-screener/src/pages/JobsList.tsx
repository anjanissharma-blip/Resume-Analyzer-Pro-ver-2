import { useJobsData, useDeleteJobMutation } from "@/hooks/use-jobs";
import { Link } from "wouter";
import { Plus, Search, MapPin, Briefcase, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

export function JobsList() {
  const { data: jobs, isLoading } = useJobsData();
  const deleteMutation = useDeleteJobMutation();
  const [searchTerm, setSearchTerm] = useState("");
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  const filteredJobs = jobs?.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    job.jobRefNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">Job References</h1>
          <p className="text-muted-foreground mt-1 text-lg">Manage job postings and screen candidates</p>
        </div>
        <Link href="/jobs/new">
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-xl transition-all h-11 px-6">
            <Plus className="mr-2 h-5 w-5" /> New Job
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <input 
          type="text"
          placeholder="Search by title or reference number..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div key={job.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col h-full group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.preventDefault(); setJobToDelete(job.id); }}
                >
                  <Trash2 size={18} />
                </Button>
              </div>

              <div className="mb-4 pr-8">
                <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold font-mono border border-slate-200 mb-3">
                  {job.jobRefNumber}
                </span>
                <h3 className="font-display font-bold text-xl text-foreground line-clamp-2 leading-tight">
                  <Link href={`/jobs/${job.id}`} className="hover:text-primary transition-colors">
                    {job.title}
                  </Link>
                </h3>
                {job.department && (
                  <p className="text-sm text-muted-foreground flex items-center mt-2 font-medium">
                    <Briefcase size={14} className="mr-1.5" /> {job.department}
                  </p>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-border">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Total</div>
                    <div className="font-display font-bold text-2xl leading-none mt-1">{job.resumeCount}</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Screened</div>
                    <div className="font-display font-bold text-2xl text-primary leading-none mt-1">{job.screenedCount}</div>
                  </div>
                </div>
                
                <Link href={`/jobs/${job.id}`}>
                  <Button className="w-full bg-slate-100 text-slate-900 hover:bg-primary hover:text-white transition-colors group">
                    Manage Resumes
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold">No jobs found</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            {searchTerm ? "Try adjusting your search query." : "You haven't created any job references yet."}
          </p>
        </div>
      )}

      <AlertDialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this job reference and ALL associated resumes and screening reports. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (jobToDelete) {
                  deleteMutation.mutate({ jobId: jobToDelete });
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
