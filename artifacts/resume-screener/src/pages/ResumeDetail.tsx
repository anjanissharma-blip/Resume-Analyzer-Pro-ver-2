import { useState } from "react";
import { useParams, Link } from "wouter";
import { useResumeData } from "@/hooks/use-resumes";
import { getDownloadResumeReportUrl } from "@workspace/api-client-react";
import { CircularProgress } from "@/components/ui/circular-progress";
import {
  ArrowLeft, Download, Mail, Phone, MapPin, Calendar, Briefcase,
  GraduationCap, User, FileText, CheckCircle2, XCircle, ShieldCheck,
  TrendingUp, AlertTriangle, Zap, Brain, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { clsx } from "clsx";

type Tab = "profile" | "skills" | "recommendation";

export function ResumeDetail() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const { data: resume, isLoading } = useResumeData(resumeId);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-12 w-72 rounded-xl" />
        <Skeleton className="h-[60vh] rounded-2xl" />
      </div>
    );
  }

  if (!resume) {
    return <div className="p-10 text-center text-lg font-bold">Resume not found.</div>;
  }

  const composite = ((resume.atsScore ?? 0) + (resume.suitabilityScore ?? 0)) / 2;
  const verdict = getVerdict(composite);
  const matchingSkills = (resume.matchingSkills as string[] ?? []);
  const skillGaps = (resume.skillGaps as string[] ?? []);
  const skills = (resume.skills as string[] ?? []);
  const matchSet = new Set(matchingSkills.map(s => s.toLowerCase()));
  const gapSet = new Set(skillGaps.map(s => s.toLowerCase()));

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <User size={15} /> },
    { id: "skills", label: "Skills Analysis", icon: <BarChart3 size={15} /> },
    { id: "recommendation", label: "AI Recommendation", icon: <Brain size={15} /> },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link href={`/jobs/${resume.jobId}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Candidates
        </Link>
        <Button onClick={() => window.open(getDownloadResumeReportUrl(resumeId), "_blank")} variant="outline" className="bg-card shadow-sm">
          <Download size={15} className="mr-2" /> Download Report
        </Button>
      </div>

      {/* Candidate header */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border border-primary/20 shrink-0">
            {resume.candidateName ? resume.candidateName.charAt(0).toUpperCase() : <User size={28} />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground mb-2">{resume.candidateName || "Unknown Candidate"}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              {resume.candidateEmail && <span className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400" />{resume.candidateEmail}</span>}
              {resume.candidatePhone && <span className="flex items-center gap-1.5"><Phone size={14} className="text-slate-400" />{resume.candidatePhone}</span>}
              {resume.candidateAddress && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" />{resume.candidateAddress}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {resume.status === "screened" && <VerdictBadge verdict={verdict} />}
            <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-slate-50">
              <FileText size={11} className="mr-1" />{resume.fileName}
            </Badge>
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
              activeTab === tab.id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Profile */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Experience */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-foreground">
              <Briefcase size={17} className="text-slate-400" /> Work Experience
            </h3>
            <div className="space-y-5">
              {((resume.experience as ExperienceItem[] | null) ?? []).length > 0 ? (
                (resume.experience as ExperienceItem[]).map((exp, idx) => (
                  <div key={idx} className="relative pl-5 border-l-2 border-slate-200 pb-1">
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-primary -left-[7px] top-1.5 border-2 border-white" />
                    <h4 className="font-bold text-foreground text-sm">{exp.title || "Unknown Role"}</h4>
                    <div className="text-sm font-semibold text-primary mt-0.5">{exp.company || "Unknown Company"}</div>
                    {exp.duration && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar size={11} />{exp.duration}
                      </div>
                    )}
                    {exp.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{exp.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No experience data extracted.</p>
              )}
            </div>
          </div>

          {/* Education */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-foreground">
              <GraduationCap size={17} className="text-slate-400" /> Education
            </h3>
            <div className="space-y-5">
              {((resume.education as EducationItem[] | null) ?? []).length > 0 ? (
                (resume.education as EducationItem[]).map((edu, idx) => (
                  <div key={idx} className="relative pl-5 border-l-2 border-slate-200 pb-1">
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-slate-400 -left-[7px] top-1.5 border-2 border-white" />
                    <h4 className="font-bold text-foreground text-sm">{edu.degree || "Degree not specified"}</h4>
                    <div className="text-sm font-semibold text-slate-700 mt-0.5">{edu.institution || "Institution not specified"}</div>
                    {edu.year && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar size={11} />{edu.year}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No education data extracted.</p>
              )}
            </div>
          </div>

          {/* All skills */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 md:col-span-2">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-foreground">
              <Zap size={17} className="text-slate-400" /> All Extracted Skills
            </h3>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map(skill => {
                  const sl = skill.toLowerCase();
                  const isMatch = matchSet.has(sl);
                  const isGap = gapSet.has(sl);
                  return (
                    <span
                      key={skill}
                      className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium border",
                        isMatch ? "bg-green-50 text-green-700 border-green-200" :
                        isGap ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      )}
                    >
                      {skill}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No skills extracted.</p>
            )}
            <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Matching skill</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Skill gap</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block" /> Other skill</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Skills Analysis */}
      {activeTab === "skills" && (
        <div className="space-y-6">
          {/* Score cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4">
              <CircularProgress value={resume.atsScore ?? 0} size={150} strokeWidth={13} label="ATS Match Score" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Keyword alignment with job description</p>
                <ScoreBar score={resume.atsScore ?? 0} />
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4">
              <CircularProgress value={resume.suitabilityScore ?? 0} size={150} strokeWidth={13} label="Overall Suitability" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">AI-assessed overall candidate fit</p>
                <ScoreBar score={resume.suitabilityScore ?? 0} />
              </div>
            </div>
          </div>

          {/* Skill match vs gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-green-700">
                <CheckCircle2 size={17} /> Matching Skills
                <span className="ml-auto text-xs font-bold bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{matchingSkills.length}</span>
              </h3>
              {matchingSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {matchingSkills.map(skill => (
                    <Badge key={skill} variant="outline" className="bg-green-50 text-green-700 border-green-200 px-2.5 py-1 text-xs">
                      <CheckCircle2 size={10} className="mr-1" />{skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No matching skills found.</p>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-red-700">
                <XCircle size={17} /> Skill Gaps
                <span className="ml-auto text-xs font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">{skillGaps.length}</span>
              </h3>
              {skillGaps.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skillGaps.map(skill => (
                    <Badge key={skill} variant="outline" className="bg-red-50 text-red-700 border-red-200 px-2.5 py-1 text-xs">
                      <XCircle size={10} className="mr-1" />{skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No skill gaps identified.</p>
              )}
            </div>
          </div>

          {/* Skill coverage bar */}
          {matchingSkills.length + skillGaps.length > 0 && (
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
              <h3 className="font-bold mb-4 text-foreground">Skill Coverage</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Required skills matched</span>
                  <span className="font-bold">{matchingSkills.length} / {matchingSkills.length + skillGaps.length}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-green-500 rounded-l-full transition-all duration-500"
                    style={{ width: `${(matchingSkills.length / (matchingSkills.length + skillGaps.length)) * 100}%` }}
                  />
                  <div
                    className="h-full bg-red-400"
                    style={{ width: `${(skillGaps.length / (matchingSkills.length + skillGaps.length)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {matchingSkills.length} matched</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> {skillGaps.length} missing</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: AI Recommendation */}
      {activeTab === "recommendation" && (
        <div className="space-y-6">
          {resume.status !== "screened" ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
                <Brain className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold">Not screened yet</h3>
              <p className="text-muted-foreground mt-1 max-w-xs mx-auto">Run AI screening to generate recommendations for this candidate.</p>
            </div>
          ) : (
            <>
              {/* Verdict card */}
              <div className={clsx(
                "rounded-2xl border p-6 shadow-sm",
                verdict === "strong" ? "bg-green-50 border-green-200" :
                verdict === "good" ? "bg-blue-50 border-blue-200" :
                "bg-red-50 border-red-200"
              )}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className={clsx(
                    "w-14 h-14 rounded-full flex items-center justify-center shrink-0",
                    verdict === "strong" ? "bg-green-100" : verdict === "good" ? "bg-blue-100" : "bg-red-100"
                  )}>
                    {verdict === "strong" ? <ShieldCheck size={28} className="text-green-600" /> :
                     verdict === "good" ? <TrendingUp size={28} className="text-blue-600" /> :
                     <AlertTriangle size={28} className="text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">AI Verdict</div>
                    <h2 className={clsx(
                      "text-2xl font-bold",
                      verdict === "strong" ? "text-green-800" : verdict === "good" ? "text-blue-800" : "text-red-800"
                    )}>
                      {verdict === "strong" ? "Highly Recommended" : verdict === "good" ? "Recommended" : "Not Recommended"}
                    </h2>
                    <p className={clsx(
                      "text-sm mt-1",
                      verdict === "strong" ? "text-green-700" : verdict === "good" ? "text-blue-700" : "text-red-700"
                    )}>
                      {verdict === "strong"
                        ? "Strong candidate — meets or exceeds most requirements."
                        : verdict === "good"
                        ? "Suitable candidate — meets core requirements with some gaps."
                        : "Candidate does not sufficiently match the role requirements."}
                    </p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <div className="text-center">
                      <div className={clsx("text-3xl font-bold", verdict === "strong" ? "text-green-700" : verdict === "good" ? "text-blue-700" : "text-red-700")}>{composite.toFixed(0)}</div>
                      <div className="text-xs text-muted-foreground font-medium">Composite</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Experience match */}
              {resume.experienceMatch && (
                <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                    <Briefcase size={17} className="text-slate-400" /> Experience Match Assessment
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{resume.experienceMatch}</p>
                </div>
              )}

              {/* AI Summary */}
              {resume.aiSummary && (
                <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <BotIcon className="w-5 h-5 text-primary" /> AI Evaluation Summary
                  </h3>
                  <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
                    {resume.aiSummary.split("\n").filter(p => p.trim()).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Ranking factors */}
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-foreground mb-4">Ranking Factors</h3>
                <div className="space-y-4">
                  {[
                    { label: "ATS Keyword Match", score: resume.atsScore ?? 0, desc: "Resume keywords vs job description" },
                    { label: "Overall Suitability", score: resume.suitabilityScore ?? 0, desc: "AI holistic assessment of fit" },
                    { label: "Skill Coverage", score: matchingSkills.length + skillGaps.length > 0 ? Math.round((matchingSkills.length / (matchingSkills.length + skillGaps.length)) * 100) : 0, desc: `${matchingSkills.length} of ${matchingSkills.length + skillGaps.length} required skills present` },
                  ].map(f => (
                    <div key={f.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold text-foreground">{f.label}</span>
                        <span className={clsx("font-bold", f.score >= 70 ? "text-green-700" : f.score >= 40 ? "text-amber-700" : "text-red-700")}>{f.score}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={clsx("h-full rounded-full transition-all duration-500", f.score >= 70 ? "bg-green-500" : f.score >= 40 ? "bg-amber-400" : "bg-red-400")}
                          style={{ width: `${f.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────── HELPERS ─────────────── */
interface ExperienceItem { title?: string; company?: string; duration?: string; description?: string }
interface EducationItem { degree?: string; institution?: string; year?: string }

function getVerdict(score: number): "strong" | "good" | "weak" {
  if (score >= 70) return "strong";
  if (score >= 45) return "good";
  return "weak";
}

function VerdictBadge({ verdict }: { verdict: "strong" | "good" | "weak" }) {
  const map = {
    strong: { label: "Highly Recommended", cls: "bg-green-100 text-green-800 border-green-300" },
    good: { label: "Recommended", cls: "bg-blue-100 text-blue-800 border-blue-300" },
    weak: { label: "Not Recommended", cls: "bg-red-100 text-red-800 border-red-300" },
  };
  const { label, cls } = map[verdict];
  return <span className={clsx("text-xs font-bold border rounded-full px-2.5 py-1", cls)}>{label}</span>;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={clsx("h-full rounded-full transition-all duration-500", color)} style={{ width: `${score}%` }} />
    </div>
  );
}

function BotIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
    </svg>
  );
}
