import { useParams, Link } from "wouter";
import { useResumeData } from "@/hooks/use-resumes";
import { getDownloadResumeReportUrl } from "@workspace/api-client-react";
import { CircularProgress } from "@/components/ui/circular-progress";
import { ArrowLeft, Download, Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap, User, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function ResumeDetail() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const { data: resume, isLoading } = useResumeData(resumeId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[80vh] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[80vh] rounded-2xl" />
      </div>
    );
  }

  if (!resume) {
    return <div className="p-10 text-center text-lg font-bold">Resume not found.</div>;
  }

  const handleDownload = () => {
    window.open(getDownloadResumeReportUrl(resumeId), '_blank');
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link href={`/jobs/${resume.jobId}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Candidates
        </Link>
        
        <Button onClick={handleDownload} variant="outline" className="bg-card shadow-sm">
          <Download size={16} className="mr-2" /> Download Report
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Candidate Profile */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Header Card */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border border-primary/20 shrink-0">
                {resume.candidateName ? resume.candidateName.charAt(0).toUpperCase() : <User size={32} />}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-display font-bold text-foreground mb-3">
                  {resume.candidateName || "Unknown Candidate"}
                </h1>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground font-medium">
                  {resume.candidateEmail && (
                    <div className="flex items-center gap-1.5"><Mail size={16} className="text-slate-400" /> {resume.candidateEmail}</div>
                  )}
                  {resume.candidatePhone && (
                    <div className="flex items-center gap-1.5"><Phone size={16} className="text-slate-400" /> {resume.candidatePhone}</div>
                  )}
                  {resume.candidateAddress && (
                    <div className="flex items-center gap-1.5"><MapPin size={16} className="text-slate-400" /> {resume.candidateAddress}</div>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-slate-50 self-start">
                <FileText size={12} className="mr-1" /> {resume.fileName}
              </Badge>
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
            <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
              <BotIcon className="w-6 h-6 text-primary" /> AI Evaluation Summary
            </h3>
            <div className="prose prose-slate max-w-none text-muted-foreground leading-relaxed">
              {resume.aiSummary ? (
                resume.aiSummary.split('\n').map((paragraph, idx) => paragraph.trim() && <p key={idx}>{paragraph}</p>)
              ) : (
                <p className="italic text-slate-400">No summary available.</p>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="font-bold text-foreground mb-2 text-sm uppercase tracking-wider">Experience Match</h4>
              <p className="text-slate-700">{resume.experienceMatch || "Not assessed"}</p>
            </div>
          </div>

          {/* Extracted Data Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-slate-400" /> Experience
              </h3>
              <div className="space-y-4">
                {(resume.experience || []).length > 0 ? (
                  resume.experience?.map((exp, idx) => (
                    <div key={idx} className="relative pl-4 border-l-2 border-slate-200 pb-2">
                      <div className="absolute w-2 h-2 rounded-full bg-primary -left-[5px] top-1.5"></div>
                      <h4 className="font-bold text-foreground text-sm">{exp.title || "Unknown Role"}</h4>
                      <div className="text-sm font-medium text-primary mt-0.5">{exp.company || "Unknown Company"}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar size={12} /> {exp.duration || "Duration not specified"}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">No experience data extracted.</p>
                )}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-slate-400" /> Education
              </h3>
              <div className="space-y-4">
                {(resume.education || []).length > 0 ? (
                  resume.education?.map((edu, idx) => (
                    <div key={idx} className="relative pl-4 border-l-2 border-slate-200 pb-2">
                      <div className="absolute w-2 h-2 rounded-full bg-slate-400 -left-[5px] top-1.5"></div>
                      <h4 className="font-bold text-foreground text-sm">{edu.degree || "Degree not specified"}</h4>
                      <div className="text-sm font-medium text-slate-700 mt-0.5">{edu.institution || "Institution not specified"}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar size={12} /> {edu.year || "Year not specified"}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">No education data extracted.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Scoring & Matching */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 relative overflow-hidden">
            <h3 className="text-lg font-display font-bold mb-6 text-center">Screening Scores</h3>
            <div className="flex flex-col items-center justify-center gap-8">
              <CircularProgress 
                value={resume.atsScore ?? 0} 
                size={140} 
                strokeWidth={12}
                label="ATS Match"
              />
              <div className="w-full h-px bg-border"></div>
              <CircularProgress 
                value={resume.suitabilityScore ?? 0} 
                size={110} 
                strokeWidth={10}
                label="Overall Suitability"
              />
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-green-700">
              <CheckCircle2 size={18} /> Matching Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {(resume.matchingSkills || []).length > 0 ? (
                resume.matchingSkills?.map(skill => (
                  <Badge key={skill} variant="outline" className="bg-green-50 text-green-700 border-green-200 px-2 py-0.5">
                    {skill}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No matching skills found.</span>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-red-700">
              <XCircle size={18} /> Missing Skills (Gaps)
            </h3>
            <div className="flex flex-wrap gap-2">
              {(resume.skillGaps || []).length > 0 ? (
                resume.skillGaps?.map(skill => (
                  <Badge key={skill} variant="outline" className="bg-red-50 text-red-700 border-red-200 px-2 py-0.5">
                    {skill}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No gaps identified.</span>
              )}
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">All Extracted Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {(resume.skills || []).map(skill => (
                <span key={skill} className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                  {skill}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function BotIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
