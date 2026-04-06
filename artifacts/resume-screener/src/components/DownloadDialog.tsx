import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, FileDown, Loader2, Users, User } from "lucide-react";
import { downloadResumeReport, getDownloadBatchReportUrl } from "@workspace/api-client-react";
import { generateCandidatePDF, generateAllCandidatesPDF, type ReportData } from "@/lib/pdf-generator";

// ── Single Candidate Download Dialog ──
interface SingleDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeId: string;
  candidateName?: string;
}

export function SingleDownloadDialog({ open, onOpenChange, resumeId, candidateName }: SingleDownloadDialogProps) {
  const [loading, setLoading] = useState<"pdf" | "csv" | null>(null);

  const fetchReport = async (): Promise<ReportData> => {
    const data = await downloadResumeReport(resumeId);
    return {
      jobRefNumber: data.jobRefNumber ?? "N/A",
      jobTitle: data.jobTitle ?? "N/A",
      jobDepartment: undefined,
      candidateName: data.candidateName ?? "Unknown",
      candidateEmail: data.candidateEmail ?? "",
      candidatePhone: data.candidatePhone ?? "",
      candidateAddress: data.candidateAddress ?? "",
      skills: (data.skills ?? []) as string[],
      experience: (data.experience ?? []) as ReportData["experience"],
      education: (data.education ?? []) as ReportData["education"],
      atsScore: data.atsScore ?? 0,
      suitabilityScore: data.suitabilityScore ?? 0,
      matchingSkills: (data.matchingSkills ?? []) as string[],
      skillGaps: (data.skillGaps ?? []) as string[],
      experienceMatch: data.experienceMatch ?? "",
      aiSummary: data.aiSummary ?? "",
      reportGeneratedAt: data.reportGeneratedAt ?? new Date().toISOString(),
      experienceYears: undefined,
    };
  };

  const handlePDF = async () => {
    setLoading("pdf");
    try {
      const report = await fetchReport();
      await generateCandidatePDF(report);
      onOpenChange(false);
    } catch (e) {
      console.error("PDF generation failed", e);
    } finally {
      setLoading(null);
    }
  };

  const handleCSV = async () => {
    setLoading("csv");
    try {
      const d = await fetchReport();
      const headers = [
        "Job Ref", "Job Title", "Candidate Name", "Email", "Phone", "Address",
        "ATS Score", "Suitability Score", "Matching Skills", "Skill Gaps",
        "Experience Match", "AI Summary"
      ];
      const row = [
        d.jobRefNumber, d.jobTitle, d.candidateName, d.candidateEmail, d.candidatePhone, d.candidateAddress,
        d.atsScore.toFixed(1), d.suitabilityScore.toFixed(1),
        d.matchingSkills.join("; "), d.skillGaps.join("; "),
        d.experienceMatch, d.aiSummary.replace(/\n/g, " ")
      ].map(v => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      });
      const csv = [headers.join(","), row.join(",")].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${d.jobRefNumber}_${(d.candidateName || "candidate").replace(/\s+/g, "_")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onOpenChange(false);
    } catch (e) {
      console.error("CSV generation failed", e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User size={18} className="text-primary" />
            Download Candidate Profile
          </DialogTitle>
          <DialogDescription>
            {candidateName ? `Download profile for ${candidateName}` : "Choose a download format."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handlePDF}
            disabled={loading !== null}
            className="w-full justify-start gap-3 h-14 bg-primary hover:bg-primary/90 text-white"
          >
            {loading === "pdf" ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
            <div className="text-left">
              <div className="font-bold text-sm">Download PDF</div>
              <div className="text-xs opacity-80">Full candidate report with logo & branding</div>
            </div>
          </Button>
          <Button
            onClick={handleCSV}
            disabled={loading !== null}
            variant="outline"
            className="w-full justify-start gap-3 h-14"
          >
            {loading === "csv" ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
            <div className="text-left">
              <div className="font-bold text-sm">Download CSV</div>
              <div className="text-xs text-muted-foreground">Spreadsheet-friendly format</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Batch (All Candidates) Download Dialog ──
interface BatchDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  jobRefNumber: string;
  resumeIds: string[];
}

export function BatchDownloadDialog({
  open, onOpenChange, jobId, jobTitle, jobRefNumber, resumeIds
}: BatchDownloadDialogProps) {
  const [loading, setLoading] = useState<"pdf" | "csv" | null>(null);
  const [progress, setProgress] = useState(0);

  const handleAllPDF = async () => {
    setLoading("pdf");
    setProgress(0);
    try {
      const reports: ReportData[] = [];
      for (let i = 0; i < resumeIds.length; i++) {
        const data = await downloadResumeReport(resumeIds[i]);
        reports.push({
          jobRefNumber: data.jobRefNumber ?? "N/A",
          jobTitle: data.jobTitle ?? "N/A",
          jobDepartment: undefined,
          candidateName: data.candidateName ?? "Unknown",
          candidateEmail: data.candidateEmail ?? "",
          candidatePhone: data.candidatePhone ?? "",
          candidateAddress: data.candidateAddress ?? "",
          skills: (data.skills ?? []) as string[],
          experience: (data.experience ?? []) as ReportData["experience"],
          education: (data.education ?? []) as ReportData["education"],
          atsScore: data.atsScore ?? 0,
          suitabilityScore: data.suitabilityScore ?? 0,
          matchingSkills: (data.matchingSkills ?? []) as string[],
          skillGaps: (data.skillGaps ?? []) as string[],
          experienceMatch: data.experienceMatch ?? "",
          aiSummary: data.aiSummary ?? "",
          reportGeneratedAt: data.reportGeneratedAt ?? new Date().toISOString(),
          experienceYears: undefined,
        });
        setProgress(Math.round(((i + 1) / resumeIds.length) * 100));
      }
      await generateAllCandidatesPDF(reports, jobTitle, jobRefNumber);
      onOpenChange(false);
    } catch (e) {
      console.error("Batch PDF failed", e);
    } finally {
      setLoading(null);
      setProgress(0);
    }
  };

  const handleCSV = () => {
    window.open(getDownloadBatchReportUrl(jobId), "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            Download All Candidates
          </DialogTitle>
          <DialogDescription>
            {jobRefNumber} · {jobTitle} · {resumeIds.length} candidate{resumeIds.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleAllPDF}
            disabled={loading !== null}
            className="w-full justify-start gap-3 h-14 bg-primary hover:bg-primary/90 text-white"
          >
            {loading === "pdf" ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
            <div className="text-left flex-1">
              <div className="font-bold text-sm">Download All as PDF</div>
              <div className="text-xs opacity-80">
                {loading === "pdf" && progress > 0
                  ? `Building... ${progress}%`
                  : "One page per candidate, with cover summary"}
              </div>
            </div>
          </Button>
          <Button
            onClick={handleCSV}
            disabled={loading !== null}
            variant="outline"
            className="w-full justify-start gap-3 h-14"
          >
            <FileDown size={18} />
            <div className="text-left">
              <div className="font-bold text-sm">Download CSV</div>
              <div className="text-xs text-muted-foreground">All candidates in one spreadsheet</div>
            </div>
          </Button>
        </div>
        {loading === "pdf" && progress > 0 && (
          <div className="mt-2">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Processing {resumeIds.length} candidates...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
