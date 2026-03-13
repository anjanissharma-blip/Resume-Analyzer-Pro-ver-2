import { useJobsData } from "@/hooks/use-jobs";
import { Link } from "wouter";
import { Briefcase, Users, CheckCircle, Plus, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export function Dashboard() {
  const { data: jobs, isLoading } = useJobsData();

  const totalJobs = jobs?.length || 0;
  const totalResumes = jobs?.reduce((sum, job) => sum + job.resumeCount, 0) || 0;
  const totalScreened = jobs?.reduce((sum, job) => sum + job.screenedCount, 0) || 0;

  const recentJobs = jobs?.slice(0, 5).reverse() || [];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1 text-lg">AI Resume Screening System Dashboard</p>
        </div>
        <Link href="/jobs/new">
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-xl transition-all w-full sm:w-auto text-base h-11">
            <Plus className="mr-2 h-5 w-5" /> Create New Job
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Total Jobs" 
            value={totalJobs} 
            icon={<Briefcase className="text-blue-600" size={24} />} 
            color="bg-blue-50" 
            delay={0.1}
          />
          <StatCard 
            title="Total Resumes" 
            value={totalResumes} 
            icon={<Users className="text-indigo-600" size={24} />} 
            color="bg-indigo-50" 
            delay={0.2}
          />
          <StatCard 
            title="Resumes Screened" 
            value={totalScreened} 
            icon={<CheckCircle className="text-emerald-600" size={24} />} 
            color="bg-emerald-50" 
            delay={0.3}
          />
        </div>
      )}

      <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <FileText className="text-primary" size={20} />
            Recent Job References
          </h2>
          <Link href="/jobs" className="text-primary hover:text-primary/80 font-medium flex items-center text-sm">
            View All <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : recentJobs.length > 0 ? (
          <div className="divide-y divide-border">
            {recentJobs.map((job, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                key={job.id} 
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
                    <div className="text-2xl font-display font-bold text-foreground">{job.resumeCount}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resumes</div>
                  </div>
                  <Link href={`/jobs/${job.id}`}>
                    <Button variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      Manage
                    </Button>
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
            <h3 className="text-lg font-bold text-foreground">No jobs created yet</h3>
            <p className="text-muted-foreground mt-1 mb-6">Create your first job reference to start screening resumes.</p>
            <Link href="/jobs/new">
              <Button className="bg-primary">Create Job</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, delay }: { title: string, value: number | string, icon: React.ReactNode, color: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow"
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-4xl font-display font-bold text-foreground leading-none">{value}</h3>
      </div>
    </motion.div>
  );
}
