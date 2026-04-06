import jsPDF from "jspdf";

// Uttarayan brand colors
const ORANGE: [number, number, number] = [224, 120, 32];
const BLUE: [number, number, number] = [65, 105, 225];
const DARK: [number, number, number] = [22, 30, 50];
const GREY: [number, number, number] = [100, 110, 130];
const LIGHT_BG: [number, number, number] = [252, 249, 245];
const WHITE: [number, number, number] = [255, 255, 255];
const GREEN: [number, number, number] = [22, 163, 74];
const GREEN_BG: [number, number, number] = [220, 252, 231];
const RED: [number, number, number] = [185, 28, 28];
const RED_BG: [number, number, number] = [254, 226, 226];

export interface ReportData {
  jobRefNumber: string;
  jobTitle: string;
  jobDepartment?: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateAddress: string;
  skills: string[];
  experience: Array<{ title?: string; company?: string; duration?: string; description?: string }>;
  education: Array<{ degree?: string; institution?: string; year?: string }>;
  atsScore: number;
  suitabilityScore: number;
  matchingSkills: string[];
  skillGaps: string[];
  experienceMatch: string;
  aiSummary: string;
  reportGeneratedAt: string;
  experienceYears?: number;
}

let _logoCache: string | null | undefined = undefined;

async function getLogoBase64(): Promise<string | null> {
  if (_logoCache !== undefined) return _logoCache;
  try {
    const response = await fetch("/uttarayan_logo.jpeg");
    const blob = await response.blob();
    _logoCache = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    _logoCache = null;
  }
  return _logoCache;
}

function getSuitabilityLabel(score: number): string {
  if (score >= 75) return "Highly Suitable";
  if (score >= 55) return "Suitable";
  if (score >= 35) return "Partially Suitable";
  return "Not Suitable";
}

function getRecommendationLabel(composite: number): string {
  if (composite >= 70) return "Proceed to Interview / Hire Shortlist";
  if (composite >= 45) return "Consider for Interview";
  return "Does Not Meet Requirements";
}

function drawSkillPills(
  doc: jsPDF,
  skills: string[],
  startX: number,
  startY: number,
  maxW: number,
  textColor: [number, number, number],
  bgColor: [number, number, number]
): number {
  const pillH = 6;
  const pillPadX = 3;
  const pillGapX = 3;
  const pillGapY = 3;
  let x = startX;
  let y = startY;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");

  for (const skill of skills) {
    const textW = doc.getTextWidth(skill);
    const pillW = textW + pillPadX * 2;

    if (x + pillW > startX + maxW) {
      x = startX;
      y += pillH + pillGapY;
    }

    doc.setFillColor(...bgColor);
    doc.setDrawColor(...textColor);
    doc.roundedRect(x, y, pillW, pillH, 1.5, 1.5, "FD");
    doc.setTextColor(...textColor);
    doc.text(skill, x + pillPadX, y + 4.3);
    x += pillW + pillGapX;
  }

  return y + pillH;
}

function addCandidatePage(
  doc: jsPDF,
  data: ReportData,
  logoBase64: string | null,
  isFirstPage: boolean
): void {
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  const composite = (data.atsScore + data.suitabilityScore) / 2;

  if (!isFirstPage) {
    doc.addPage();
  }

  const pageNum = (doc as any).internal.getNumberOfPages();

  const drawFooter = () => {
    const fy = pageH - 10;
    doc.setFillColor(...BLUE);
    doc.rect(0, pageH - 14, pageW, 14, "F");
    doc.setFontSize(7.5);
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.text("Screened through Uttarayan", margin, fy);
    doc.setFont("helvetica", "normal");
    doc.text(`Ref: ${data.jobRefNumber} · ${data.jobTitle}`, pageW / 2, fy, { align: "center" });
    doc.text(`Page ${pageNum}`, pageW - margin, fy, { align: "right" });
  };

  // ── HEADER ──
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setFillColor(...BLUE);
  doc.rect(0, 28, pageW, 2.5, "F");

  // Logo top-right
  if (logoBase64) {
    doc.addImage(logoBase64, "JPEG", pageW - margin - 22, 3, 22, 22, undefined, "FAST");
  }

  // ATS score badge (left of logo)
  const scoreX = pageW - margin - 26;
  doc.setFillColor(...WHITE);
  doc.roundedRect(scoreX - 26, 4, 22, 20, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...ORANGE);
  doc.text(String(Math.round(data.atsScore)), scoreX - 15, 16.5, { align: "center" });
  doc.setFontSize(6);
  doc.setTextColor(...DARK);
  doc.text("ATS SCORE", scoreX - 15, 21.5, { align: "center" });

  // Candidate name & email
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text(data.candidateName || "Unknown Candidate", margin, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 215, 180);
  doc.text(data.candidateEmail || "", margin, 20);

  let y = 38;

  // Report title + date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text("CANDIDATE PROFILE REPORT", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const genDate = new Date(data.reportGeneratedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`Generated: ${genDate}`, pageW - margin, y, { align: "right" });
  y += 7;

  // ── CONTACT DETAILS ──
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(margin, y, contentW, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...ORANGE);
  doc.text("CONTACT DETAILS", margin + 4, y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  const col = contentW / 3;
  doc.text(`Phone: ${data.candidatePhone || "Not specified"}`, margin + 4, y + 13);
  doc.text(`Email: ${data.candidateEmail || "Not specified"}`, margin + 4 + col, y + 13);
  doc.text(`Address: ${data.candidateAddress || "Not specified"}`, margin + 4 + col * 2, y + 13);
  y += 27;

  // ── ASSESSED FOR ──
  doc.setFillColor(235, 243, 255);
  doc.roundedRect(margin, y, contentW, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLUE);
  doc.text("ASSESSED FOR", margin + 4, y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  doc.text(`Reference No: ${data.jobRefNumber}`, margin + 4, y + 13);
  doc.text(`Job Title: ${data.jobTitle}${data.jobDepartment ? ` · Dept: ${data.jobDepartment}` : ""}`, margin + 4 + col, y + 13);
  y += 27;

  // ── SUITABILITY + EXPERIENCE ──
  const halfW = (contentW - 4) / 2;
  doc.setFillColor(...ORANGE);
  doc.roundedRect(margin, y, halfW, 20, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text("SUITABILITY RATING", margin + halfW / 2, y + 6, { align: "center" });
  doc.setFontSize(10);
  doc.text(getSuitabilityLabel(data.suitabilityScore), margin + halfW / 2, y + 14, { align: "center" });

  doc.setFillColor(...BLUE);
  doc.roundedRect(margin + halfW + 4, y, halfW, 20, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text("EXPERIENCE (YEARS)", margin + halfW + 4 + halfW / 2, y + 6, { align: "center" });
  doc.setFontSize(10);
  const expYrs = data.experienceYears != null ? data.experienceYears.toFixed(1) : "N/A";
  doc.text(expYrs, margin + halfW + 4 + halfW / 2, y + 14, { align: "center" });
  y += 26;

  // Section header helper
  const section = (title: string, color: [number, number, number]) => {
    doc.setFillColor(...color);
    doc.rect(margin, y, 3, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...color);
    doc.text(title, margin + 6, y + 5.5);
    y += 10;
  };

  // ── CANDIDATE PROFILE SUMMARY ──
  section("CANDIDATE PROFILE SUMMARY", ORANGE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  const summaryLines = doc.splitTextToSize(data.aiSummary || "Not available", contentW);
  const maxSum = Math.min(summaryLines.length, 7);
  doc.text(summaryLines.slice(0, maxSum), margin, y);
  y += maxSum * 4.5 + 5;

  // ── EDUCATIONAL QUALIFICATIONS ──
  if (data.education && data.education.length > 0) {
    section("EDUCATIONAL QUALIFICATIONS", BLUE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    for (const edu of data.education.slice(0, 4)) {
      const line = [edu.degree, edu.institution, edu.year].filter(Boolean).join(" · ");
      if (line) {
        doc.text("• " + line, margin + 2, y);
        y += 5;
      }
    }
    y += 3;
  }

  // ── EXPERIENCE ASSESSMENT ──
  section("EXPERIENCE ASSESSMENT", BLUE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  const expLines = doc.splitTextToSize(data.experienceMatch || "No assessment available.", contentW);
  const maxExp = Math.min(expLines.length, 6);
  doc.text(expLines.slice(0, maxExp), margin, y);
  y += maxExp * 4.5 + 5;

  // ── MATCHING SKILLS ──
  if (data.matchingSkills.length > 0) {
    section(`MATCHING SKILLS (${data.matchingSkills.length})`, GREEN);
    y = drawSkillPills(doc, data.matchingSkills, margin, y, contentW, GREEN, GREEN_BG);
    y += 6;
  }

  // ── SKILLS GAP ──
  if (data.skillGaps.length > 0) {
    section(`SKILLS GAP (${data.skillGaps.length})`, RED);
    y = drawSkillPills(doc, data.skillGaps, margin, y, contentW, RED, RED_BG);
    y += 6;
  }

  // ── RECOMMENDATION ──
  if (y > pageH - 60) {
    doc.addPage();
    y = 20;
    if (logoBase64) {
      doc.addImage(logoBase64, "JPEG", pageW - margin - 18, 4, 16, 16, undefined, "FAST");
    }
    drawFooter();
  }

  section("RECOMMENDATION", ORANGE);

  const recLabel = getRecommendationLabel(composite);
  const aiParas = (data.aiSummary || "").split("\n").filter(p => p.trim());
  const recText = aiParas.length > 0 ? aiParas[aiParas.length - 1] : "Based on the screening assessment.";
  const recLines = doc.splitTextToSize(recText, contentW - 35);

  const recBoxH = Math.max(30, recLines.length * 4.5 + 18);
  doc.setFillColor(255, 247, 235);
  doc.setDrawColor(...ORANGE);
  doc.roundedRect(margin, y, contentW, recBoxH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...ORANGE);
  doc.text(recLabel, margin + 5, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  doc.text(recLines, margin + 5, y + 17);

  // Composite score pill
  doc.setFillColor(...ORANGE);
  doc.roundedRect(pageW - margin - 30, y + 4, 26, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.text(String(Math.round(composite)), pageW - margin - 17, y + 17, { align: "center" });
  doc.setFontSize(6);
  doc.text("COMPOSITE", pageW - margin - 17, y + 24, { align: "center" });

  drawFooter();
}

export async function generateCandidatePDF(data: ReportData): Promise<void> {
  const logoBase64 = await getLogoBase64();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  addCandidatePage(doc, data, logoBase64, true);
  doc.save(`${data.jobRefNumber}_${(data.candidateName || "candidate").replace(/\s+/g, "_")}.pdf`);
}

export async function generateAllCandidatesPDF(
  candidates: ReportData[],
  jobTitle: string,
  jobRefNumber: string
): Promise<void> {
  const logoBase64 = await getLogoBase64();
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── COVER PAGE ──
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageW, 45, "F");
  doc.setFillColor(...BLUE);
  doc.rect(0, 45, pageW, 3, "F");

  if (logoBase64) {
    doc.addImage(logoBase64, "JPEG", margin, 8, 30, 30, undefined, "FAST");
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.text("Candidate Batch Report", margin + 38, 24);
  doc.setFontSize(10);
  doc.setTextColor(255, 215, 180);
  doc.text(`${jobRefNumber} · ${jobTitle}`, margin + 38, 34);

  let cy = 58;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  const genDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`Generated: ${genDate}`, margin, cy);
  doc.text(`Total Candidates: ${candidates.length}`, margin, cy + 6);
  cy += 18;

  // Ranked table header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...ORANGE);
  doc.text("CANDIDATE RANKING SUMMARY", margin, cy);
  cy += 7;

  doc.setFillColor(...BLUE);
  doc.rect(margin, cy, contentW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text("#", margin + 3, cy + 5);
  doc.text("Candidate Name", margin + 13, cy + 5);
  doc.text("Email", margin + 78, cy + 5);
  doc.text("ATS", margin + 120, cy + 5);
  doc.text("Suit.", margin + 135, cy + 5);
  doc.text("Score", margin + 151, cy + 5);
  doc.text("Verdict", margin + 167, cy + 5);
  cy += 9;

  const sorted = [...candidates].sort((a, b) => {
    const ca = (a.atsScore + a.suitabilityScore) / 2;
    const cb = (b.atsScore + b.suitabilityScore) / 2;
    return cb - ca;
  });

  sorted.forEach((c, idx) => {
    const comp = (c.atsScore + c.suitabilityScore) / 2;
    const rowBg: [number, number, number] = idx % 2 === 0 ? [252, 249, 245] : [255, 255, 255];
    doc.setFillColor(...rowBg);
    doc.rect(margin, cy - 1, contentW, 7, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(String(idx + 1), margin + 3, cy + 4);
    doc.text((c.candidateName || "Unknown").substring(0, 28), margin + 13, cy + 4);
    doc.text((c.candidateEmail || "").substring(0, 30), margin + 78, cy + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ORANGE);
    doc.text(String(Math.round(c.atsScore)), margin + 120, cy + 4);
    doc.setTextColor(...BLUE);
    doc.text(String(Math.round(c.suitabilityScore)), margin + 135, cy + 4);
    doc.setTextColor(...DARK);
    doc.text(String(Math.round(comp)), margin + 151, cy + 4);
    doc.setFont("helvetica", "normal");
    const v = comp >= 70 ? "Proceed" : comp >= 45 ? "Consider" : "Not Suitable";
    const vc: [number, number, number] = comp >= 70 ? GREEN : comp >= 45 ? ORANGE : RED;
    doc.setTextColor(...vc);
    doc.text(v, margin + 167, cy + 4);
    cy += 8;
  });

  // Cover footer
  doc.setFillColor(...BLUE);
  doc.rect(0, pageH - 14, pageW, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text("Screened through Uttarayan", margin, pageH - 5);
  doc.text(`Ref: ${jobRefNumber} · ${jobTitle}`, pageW / 2, pageH - 5, { align: "center" });
  doc.text("Page 1", pageW - margin, pageH - 5, { align: "right" });

  // ── CANDIDATE PAGES ──
  for (const candidate of sorted) {
    addCandidatePage(doc, candidate, logoBase64, false);
  }

  doc.save(`${jobRefNumber}_all_candidates_report.pdf`);
}
