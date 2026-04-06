import jsPDF from "jspdf";

/* ─── Brand colours ─── */
const C = {
  orange:   [224, 120,  32] as [number,number,number],
  blue:     [ 55,  96, 210] as [number,number,number],
  dark:     [ 22,  30,  50] as [number,number,number],
  grey:     [110, 118, 138] as [number,number,number],
  lightBg:  [252, 249, 245] as [number,number,number],
  blueBg:   [235, 242, 255] as [number,number,number],
  white:    [255, 255, 255] as [number,number,number],
  green:    [ 20, 150,  68] as [number,number,number],
  greenBg:  [220, 252, 231] as [number,number,number],
  red:      [185,  28,  28] as [number,number,number],
  redBg:    [254, 226, 226] as [number,number,number],
  warmOff:  [255, 247, 237] as [number,number,number],
};

/* ─── Layout constants ─── */
const PW   = 210;          // page width  (A4)
const PH   = 297;          // page height (A4)
const ML   = 14;           // left margin
const MR   = 14;           // right margin
const CW   = PW - ML - MR; // content width  (182mm)
const FOOTER_H = 13;       // footer strip height

/* ─── Typographic helpers ─── */
// jsPDF text y = baseline. Offset to vertically centre in a box.
function tv(boxY: number, boxH: number, fontSize: number): number {
  // approx cap height = fontSize(pt) * 0.352778 mm * 0.72
  return boxY + boxH / 2 + (fontSize * 0.352778 * 0.36);
}

function setFont(doc: jsPDF, weight: "normal"|"bold", size: number, color: [number,number,number]) {
  doc.setFont("helvetica", weight);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function fill(doc: jsPDF, color: [number,number,number]) { doc.setFillColor(...color); }
function stroke(doc: jsPDF, color: [number,number,number]) { doc.setDrawColor(...color); }

/* ─── Page-break guard ─── */
// Returns new y; adds a continuation page if needed.
function guard(
  doc: jsPDF, y: number, needed: number,
  logoB64: string|null, footerFn: ()=>void
): number {
  if (y + needed <= PH - FOOTER_H - 6) return y;
  footerFn();          // close current page footer
  doc.addPage();
  y = 20;
  // mini logo on continuation pages
  if (logoB64) doc.addImage(logoB64, "JPEG", PW - MR - 16, 4, 14, 14, undefined, "FAST");
  return y;
}

/* ─── Skill pills ─── */
// Returns new Y after all pills are drawn.
function skillPills(
  doc: jsPDF, skills: string[],
  x0: number, y0: number, maxW: number,
  textColor: [number,number,number], bgColor: [number,number,number]
): number {
  const PH_PILL = 6.2;
  const PAD_X   = 3.2;
  const GAP_X   = 2.5;
  const GAP_Y   = 2.8;
  const FONT    = 7.5;

  setFont(doc, "normal", FONT, textColor);
  let x = x0, y = y0;

  for (const skill of skills) {
    const tw   = doc.getTextWidth(skill);
    const pillW = tw + PAD_X * 2;

    if (x + pillW > x0 + maxW + 0.5) {   // wrap row
      x = x0;
      y += PH_PILL + GAP_Y;
    }

    fill(doc, bgColor);
    stroke(doc, textColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, pillW, PH_PILL, 1.4, 1.4, "FD");
    doc.setTextColor(...textColor);
    doc.text(skill, x + PAD_X, tv(y, PH_PILL, FONT));
    x += pillW + GAP_X;
  }
  return y + PH_PILL;
}

/* ─── Section header (left accent bar + title) ─── */
function sectionHeader(doc: jsPDF, title: string, color: [number,number,number], y: number): number {
  const BAR_W  = 3.5;
  const BAR_H  = 8;
  const FONT   = 8.5;
  fill(doc, color);
  doc.rect(ML, y, BAR_W, BAR_H, "F");
  setFont(doc, "bold", FONT, color);
  doc.text(title, ML + BAR_W + 3.5, tv(y, BAR_H, FONT));
  return y + BAR_H + 2; // return y below header
}

/* ─── Labelled info row inside a tinted box ─── */
function infoBox(
  doc: jsPDF,
  label: string, labelColor: [number,number,number],
  bgColor: [number,number,number],
  items: { k: string; v: string }[],
  y: number
): number {
  const LABEL_H  = 6;
  const ROW_H    = 7;
  const PAD_X    = 4;
  const BOX_H    = LABEL_H + ROW_H + 4;

  fill(doc, bgColor);
  doc.rect(ML, y, CW, BOX_H, "F");

  // small label at top-left
  setFont(doc, "bold", 7, labelColor);
  doc.text(label, ML + PAD_X, y + 4.5);

  // items spread across the row
  const colW = CW / items.length;
  items.forEach((item, i) => {
    const cx = ML + PAD_X + i * colW;
    setFont(doc, "bold", 7.5, C.grey);
    doc.text(item.k + ":", cx, y + LABEL_H + 4);
    setFont(doc, "normal", 8, C.dark);
    // allow enough room for value
    const maxV = colW - PAD_X - 2;
    const val = item.v || "Not specified";
    const clipped = doc.splitTextToSize(val, maxV)[0] as string;
    doc.text(clipped, cx + doc.getTextWidth(item.k + ": ") + 0.5, y + LABEL_H + 4);
  });

  return y + BOX_H + 3; // gap after box
}

/* ─── Labelled info box (label left, full-width value) ─── */
function infoBoxWide(
  doc: jsPDF,
  label: string, labelColor: [number,number,number],
  bgColor: [number,number,number],
  pairs: [string, string][],   // [[key, value], ...]
  y: number
): number {
  const PAD_X    = 4;
  const LABEL_H  = 5.5;
  const LINE_H   = 5.5;
  const BOX_H    = LABEL_H + pairs.length * LINE_H + 3;

  fill(doc, bgColor);
  doc.rect(ML, y, CW, BOX_H, "F");

  setFont(doc, "bold", 7, labelColor);
  doc.text(label, ML + PAD_X, y + 4);

  pairs.forEach(([k, v], i) => {
    const rowY = y + LABEL_H + 1 + i * LINE_H;
    setFont(doc, "bold", 7.8, C.grey);
    const kw = doc.getTextWidth(k + ": ");
    doc.text(k + ": ", ML + PAD_X, rowY + LINE_H * 0.72);
    setFont(doc, "normal", 7.8, C.dark);
    const maxV = CW - PAD_X * 2 - kw;
    const lines = doc.splitTextToSize(v || "Not specified", maxV);
    doc.text((lines as string[])[0], ML + PAD_X + kw, rowY + LINE_H * 0.72);
  });

  return y + BOX_H + 3;
}

/* ─── Two equal highlight boxes side by side ─── */
function twinHighlight(
  doc: jsPDF,
  leftLabel: string, leftValue: string, leftColor: [number,number,number],
  rightLabel: string, rightValue: string, rightColor: [number,number,number],
  y: number
): number {
  const GAP     = 4;
  const BOX_W   = (CW - GAP) / 2;
  const BOX_H   = 18;

  // Left
  fill(doc, leftColor);
  doc.rect(ML, y, BOX_W, BOX_H, "F");
  setFont(doc, "bold", 7, C.white);
  doc.text(leftLabel, ML + BOX_W / 2, y + 5.5, { align: "center" });
  setFont(doc, "bold", 11, C.white);
  doc.text(leftValue, ML + BOX_W / 2, y + 14, { align: "center" });

  // Right
  fill(doc, rightColor);
  doc.rect(ML + BOX_W + GAP, y, BOX_W, BOX_H, "F");
  setFont(doc, "bold", 7, C.white);
  doc.text(rightLabel, ML + BOX_W + GAP + BOX_W / 2, y + 5.5, { align: "center" });
  setFont(doc, "bold", 11, C.white);
  doc.text(rightValue, ML + BOX_W + GAP + BOX_W / 2, y + 14, { align: "center" });

  return y + BOX_H + 4;
}

/* ─── Body text block (wrapped, limited lines) ─── */
function bodyText(
  doc: jsPDF, text: string,
  y: number, maxLines = 8, fontSize = 8.5, lineH = 5
): number {
  setFont(doc, "normal", fontSize, C.dark);
  const lines = doc.splitTextToSize(text || "Not available.", CW) as string[];
  const capped = lines.slice(0, maxLines);
  doc.text(capped, ML, y + fontSize * 0.352778 * 0.4);
  return y + capped.length * lineH;
}

/* ─── Bullet list ─── */
function bulletList(doc: jsPDF, items: string[], y: number, fontSize = 8, lineH = 5.2): number {
  setFont(doc, "normal", fontSize, C.dark);
  for (const item of items) {
    const lines = doc.splitTextToSize("• " + item, CW - 4) as string[];
    doc.text(lines, ML + 3, y + fontSize * 0.352778 * 0.4);
    y += lines.length * lineH;
  }
  return y;
}

/* ───────────────────────────────────── */
/* ─── EXPORTED TYPES                    */
/* ───────────────────────────────────── */
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

/* ─── Logo cache ─── */
let _logo: string | null | undefined = undefined;
async function getLogo(): Promise<string | null> {
  if (_logo !== undefined) return _logo;
  try {
    const blob = await fetch("/uttarayan_logo.jpeg").then(r => r.blob());
    _logo = await new Promise(res => {
      const fr = new FileReader();
      fr.onloadend = () => res(fr.result as string);
      fr.onerror   = () => res(null);
      fr.readAsDataURL(blob);
    });
  } catch { _logo = null; }
  return _logo;
}

/* ─── Helper labels ─── */
function suitLabel(s: number) {
  if (s >= 75) return "Highly Suitable";
  if (s >= 55) return "Suitable";
  if (s >= 35) return "Partially Suitable";
  return "Not Suitable";
}
function recLabel(c: number) {
  if (c >= 70) return "Proceed to Interview / Hire Shortlist";
  if (c >= 45) return "Consider for Interview";
  return "Does Not Meet Requirements";
}

/* ───────────────────────────────────────────────────────── */
/* ─── CORE: draw one candidate report onto the current page */
/* ───────────────────────────────────────────────────────── */
function renderCandidate(doc: jsPDF, data: ReportData, logo: string | null): void {
  const composite = (data.atsScore + data.suitabilityScore) / 2;
  const pageIndex  = (doc as any).internal.getNumberOfPages();

  /* ── Footer closure (captures pageIndex) ── */
  const footer = () => {
    const fy = PH - 4;
    fill(doc, C.blue);
    doc.rect(0, PH - FOOTER_H, PW, FOOTER_H, "F");
    setFont(doc, "bold", 7.5, C.white);
    doc.text("Screened through Uttarayan", ML, fy);
    setFont(doc, "normal", 7.5, C.white);
    doc.text(`Ref: ${data.jobRefNumber} · ${data.jobTitle}`, PW / 2, fy, { align: "center" });
    doc.text(String(pageIndex), PW - MR, fy, { align: "right" });
  };

  /* ══════════════════════════════════════════ */
  /* HEADER                                    */
  /* ══════════════════════════════════════════ */
  const HDR_H = 30;
  fill(doc, C.orange);
  doc.rect(0, 0, PW, HDR_H, "F");
  fill(doc, C.blue);
  doc.rect(0, HDR_H, PW, 2.5, "F");

  // Logo — top-right corner
  if (logo) doc.addImage(logo, "JPEG", PW - MR - 22, 4, 22, 22, undefined, "FAST");

  // ATS score badge — just left of logo
  const BADGE_W = 20; const BADGE_H = 20;
  const badgeX  = PW - MR - 22 - BADGE_W - 4;
  fill(doc, C.white);
  doc.roundedRect(badgeX, 5, BADGE_W, BADGE_H, 2.5, 2.5, "F");
  setFont(doc, "bold", 15, C.orange);
  doc.text(String(Math.round(data.atsScore)), badgeX + BADGE_W / 2, tv(5, BADGE_H * 0.65, 15), { align: "center" });
  setFont(doc, "bold", 5.5, C.dark);
  doc.text("ATS SCORE", badgeX + BADGE_W / 2, 5 + BADGE_H - 2.5, { align: "center" });

  // Candidate name + email
  setFont(doc, "bold", 14, C.white);
  doc.text(data.candidateName || "Unknown Candidate", ML, 15);
  setFont(doc, "normal", 8.5, [255, 215, 175]);
  doc.text(data.candidateEmail || "", ML, 23);

  /* ══════════════════════════════════════════ */
  /* TITLE ROW                                 */
  /* ══════════════════════════════════════════ */
  let y = HDR_H + 6;
  setFont(doc, "bold", 7.5, C.grey);
  doc.text("CANDIDATE PROFILE REPORT", ML, y);
  const genDate = new Date(data.reportGeneratedAt)
    .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  setFont(doc, "normal", 7.5, C.grey);
  doc.text(`Generated: ${genDate}`, PW - MR, y, { align: "right" });
  y += 7;

  /* ══════════════════════════════════════════ */
  /* CONTACT DETAILS                           */
  /* ══════════════════════════════════════════ */
  {
    const BOX_H = 14; const PAD = 3.5;
    fill(doc, C.lightBg);
    doc.rect(ML, y, CW, BOX_H, "F");
    setFont(doc, "bold", 6.5, C.orange);
    doc.text("CONTACT DETAILS", ML + PAD, y + 4);

    const colW = CW / 3;
    const rowY = y + 9.5;
    const fields = [
      { label: "Phone",   val: data.candidatePhone   || "Not specified" },
      { label: "Email",   val: data.candidateEmail   || "Not specified" },
      { label: "Address", val: data.candidateAddress || "Not specified" },
    ];
    fields.forEach(({ label, val }, i) => {
      const cx = ML + PAD + i * colW;
      setFont(doc, "bold", 7, C.grey);
      const lw = doc.getTextWidth(label + ": ");
      doc.text(label + ": ", cx, rowY);
      setFont(doc, "normal", 7.5, C.dark);
      const maxV = colW - PAD - lw - 2;
      const clipped = (doc.splitTextToSize(val, maxV) as string[])[0];
      doc.text(clipped, cx + lw, rowY);
    });
    y += BOX_H + 3;
  }

  /* ══════════════════════════════════════════ */
  /* ASSESSED FOR                              */
  /* ══════════════════════════════════════════ */
  {
    const BOX_H = 14; const PAD = 3.5;
    fill(doc, C.blueBg);
    doc.rect(ML, y, CW, BOX_H, "F");
    setFont(doc, "bold", 6.5, C.blue);
    doc.text("ASSESSED FOR", ML + PAD, y + 4);

    const rowY  = y + 9.5;
    const colW  = CW / 2;
    setFont(doc, "bold", 7, C.grey);
    doc.text("Reference No: ", ML + PAD, rowY);
    setFont(doc, "normal", 7.5, C.dark);
    doc.text(data.jobRefNumber, ML + PAD + doc.getTextWidth("Reference No: "), rowY);

    setFont(doc, "bold", 7, C.grey);
    const jx = ML + PAD + colW;
    doc.text("Job Title: ", jx, rowY);
    setFont(doc, "normal", 7.5, C.dark);
    const jobStr = data.jobTitle + (data.jobDepartment ? ` · Dept: ${data.jobDepartment}` : "");
    doc.text((doc.splitTextToSize(jobStr, colW - PAD - 4) as string[])[0], jx + doc.getTextWidth("Job Title: "), rowY);

    y += BOX_H + 3;
  }

  /* ══════════════════════════════════════════ */
  /* SUITABILITY  +  EXPERIENCE YEARS          */
  /* ══════════════════════════════════════════ */
  y = twinHighlight(
    doc,
    "SUITABILITY RATING",  suitLabel(data.suitabilityScore), C.orange,
    "EXPERIENCE (YEARS)",  data.experienceYears != null ? data.experienceYears.toFixed(1) : "N/A", C.blue,
    y
  );

  /* ══════════════════════════════════════════ */
  /* CANDIDATE PROFILE SUMMARY                 */
  /* ══════════════════════════════════════════ */
  y = guard(doc, y, 40, logo, footer);
  y = sectionHeader(doc, "CANDIDATE PROFILE SUMMARY", C.orange, y);
  y = bodyText(doc, data.aiSummary, y, 8, 8.5, 5);
  y += 5;

  /* ══════════════════════════════════════════ */
  /* EDUCATIONAL QUALIFICATIONS                */
  /* ══════════════════════════════════════════ */
  const edus = (data.education || []).filter(e => e.degree || e.institution);
  if (edus.length > 0) {
    y = guard(doc, y, 10 + edus.length * 5.5, logo, footer);
    y = sectionHeader(doc, "EDUCATIONAL QUALIFICATIONS", C.blue, y);
    y = bulletList(doc, edus.slice(0, 5).map(e =>
      [e.degree, e.institution, e.year].filter(Boolean).join("  ·  ")
    ), y);
    y += 5;
  }

  /* ══════════════════════════════════════════ */
  /* EXPERIENCE ASSESSMENT                     */
  /* ══════════════════════════════════════════ */
  if (data.experienceMatch) {
    y = guard(doc, y, 35, logo, footer);
    y = sectionHeader(doc, "EXPERIENCE ASSESSMENT", C.blue, y);
    y = bodyText(doc, data.experienceMatch, y, 7, 8.5, 5);
    y += 5;
  }

  /* ══════════════════════════════════════════ */
  /* MATCHING SKILLS                           */
  /* ══════════════════════════════════════════ */
  const ms = data.matchingSkills || [];
  if (ms.length > 0) {
    // Estimate rows needed: rough pill width ~20mm per skill, ~8 across
    const pillRows = Math.ceil(ms.length / 7);
    y = guard(doc, y, 12 + pillRows * 10, logo, footer);
    y = sectionHeader(doc, `MATCHING SKILLS  (${ms.length})`, C.green, y);
    y = skillPills(doc, ms, ML, y, CW, C.green, C.greenBg);
    y += 6;
  }

  /* ══════════════════════════════════════════ */
  /* SKILLS GAP                                */
  /* ══════════════════════════════════════════ */
  const sg = data.skillGaps || [];
  if (sg.length > 0) {
    const pillRows = Math.ceil(sg.length / 7);
    y = guard(doc, y, 12 + pillRows * 10, logo, footer);
    y = sectionHeader(doc, `SKILLS GAP  (${sg.length})`, C.red, y);
    y = skillPills(doc, sg, ML, y, CW, C.red, C.redBg);
    y += 6;
  }

  /* ══════════════════════════════════════════ */
  /* RECOMMENDATION                            */
  /* ══════════════════════════════════════════ */
  y = guard(doc, y, 52, logo, footer);
  y = sectionHeader(doc, "RECOMMENDATION", C.orange, y);

  // Derive recommendation body: use last paragraph of aiSummary, or full text if short
  const paras = (data.aiSummary || "").split("\n").map(p => p.trim()).filter(Boolean);
  const recBody = paras.length > 1 ? paras[paras.length - 1] : (data.aiSummary || "Based on the screening assessment.");

  const SCORE_W  = 28;
  const REC_PAD  = 4;
  const textW    = CW - SCORE_W - REC_PAD * 3;
  const recLines = doc.splitTextToSize(recBody, textW) as string[];
  const cappedRec = recLines.slice(0, 5);
  const BOX_H    = Math.max(38, cappedRec.length * 5 + 22);

  // Recommendation box
  fill(doc, C.warmOff);
  stroke(doc, C.orange);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, CW, BOX_H, 2, 2, "FD");

  // Recommendation label
  setFont(doc, "bold", 9.5, C.orange);
  doc.text(recLabel(composite), ML + REC_PAD, y + 10);

  // Body text
  setFont(doc, "normal", 8, C.dark);
  doc.text(cappedRec, ML + REC_PAD, y + 17);

  // Score pill (right side)
  const PILL_X  = ML + CW - SCORE_W - REC_PAD + 2;
  const PILL_Y  = y + 6;
  const PILL_H  = 22;
  fill(doc, C.orange);
  doc.roundedRect(PILL_X, PILL_Y, SCORE_W - 4, PILL_H, 2.5, 2.5, "F");
  setFont(doc, "bold", 16, C.white);
  doc.text(String(Math.round(composite)), PILL_X + (SCORE_W - 4) / 2, PILL_Y + 13, { align: "center" });
  setFont(doc, "bold", 5.5, C.white);
  doc.text("COMPOSITE", PILL_X + (SCORE_W - 4) / 2, PILL_Y + 20, { align: "center" });

  y += BOX_H + 4;

  /* ══════════════════════════════════════════ */
  /* SCORE SUMMARY BAR                         */
  /* ══════════════════════════════════════════ */
  y = guard(doc, y, 18, logo, footer);
  const colW3 = (CW - 8) / 3;
  const scorePairs = [
    { label: "ATS Score",   value: data.atsScore,      color: C.orange },
    { label: "Suitability", value: data.suitabilityScore, color: C.blue },
    { label: "Composite",   value: composite,           color: C.dark },
  ];
  scorePairs.forEach(({ label, value, color }, i) => {
    const bx = ML + i * (colW3 + 4);
    const BY = 14;
    fill(doc, C.lightBg);
    doc.rect(bx, y, colW3, BY, "F");
    setFont(doc, "bold", 11, color);
    doc.text(String(Math.round(value)), bx + colW3 / 2, y + 8.5, { align: "center" });
    setFont(doc, "normal", 6.5, C.grey);
    doc.text(label, bx + colW3 / 2, y + 13, { align: "center" });
  });

  footer();
}

/* ────────────────────────────────── */
/* PUBLIC API                         */
/* ────────────────────────────────── */

export async function generateCandidatePDF(data: ReportData): Promise<void> {
  const logo = await getLogo();
  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  renderCandidate(doc, data, logo);
  doc.save(`${data.jobRefNumber}_${(data.candidateName || "candidate").replace(/\s+/g, "_")}.pdf`);
}

export async function generateAllCandidatesPDF(
  candidates: ReportData[],
  jobTitle: string,
  jobRefNumber: string
): Promise<void> {
  const logo = await getLogo();
  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  /* ─── COVER PAGE ─── */
  const HDR_H = 48;
  fill(doc, C.orange);
  doc.rect(0, 0, PW, HDR_H, "F");
  fill(doc, C.blue);
  doc.rect(0, HDR_H, PW, 3, "F");

  if (logo) doc.addImage(logo, "JPEG", ML, 9, 30, 30, undefined, "FAST");
  setFont(doc, "bold", 20, C.white);
  doc.text("Candidate Batch Report", ML + 38, 22);
  setFont(doc, "bold", 10, [255, 215, 175]);
  doc.text(`${jobRefNumber}  ·  ${jobTitle}`, ML + 38, 32);

  let cy = HDR_H + 10;
  setFont(doc, "normal", 8.5, C.dark);
  const genD = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`Generated: ${genD}`, ML, cy);
  doc.text(`Total Candidates: ${candidates.length}`, ML + 70, cy);
  cy += 10;

  /* Ranking table */
  setFont(doc, "bold", 9, C.orange);
  doc.text("CANDIDATE RANKING SUMMARY", ML, cy);
  cy += 6;

  // Column definitions (x offset from ML, width, label, align)
  type ColDef = [number, number, string, "left" | "right"];
  const cols: ColDef[] = [
    [ 0,   8,  "#",      "right" ],
    [ 10,  60, "Name",   "left"  ],
    [ 73,  50, "Email",  "left"  ],
    [126,  14, "ATS",    "right" ],
    [142,  14, "Suit.",  "right" ],
    [158,  14, "Score",  "right" ],
    [175,  25, "Verdict","left"  ],
  ];

  const ROW_H   = 7;
  const THEAD_H = ROW_H;

  // Header row
  fill(doc, C.blue);
  doc.rect(ML, cy, CW, THEAD_H, "F");
  setFont(doc, "bold", 7, C.white);
  cols.forEach(([dx, dw, label, align]) => {
    const tx = align === "right" ? ML + dx + dw : ML + dx + 1.5;
    doc.text(label, tx, tv(cy, THEAD_H, 7), { align });
  });
  cy += THEAD_H;

  // Sort candidates
  const sorted = [...candidates].sort((a, b) =>
    ((b.atsScore + b.suitabilityScore) / 2) - ((a.atsScore + a.suitabilityScore) / 2)
  );

  sorted.forEach((c, idx) => {
    const comp = (c.atsScore + c.suitabilityScore) / 2;
    const bg: [number,number,number] = idx % 2 === 0 ? [252, 249, 245] : C.white;
    fill(doc, bg);
    doc.rect(ML, cy, CW, ROW_H, "F");

    setFont(doc, "normal", 7.5, C.dark);
    // #
    doc.text(String(idx + 1), ML + 8, tv(cy, ROW_H, 7.5), { align: "right" });
    // Name
    doc.text((c.candidateName || "Unknown").substring(0, 26), ML + 10 + 1.5, tv(cy, ROW_H, 7.5));
    // Email
    doc.text((c.candidateEmail || "").substring(0, 28), ML + 73 + 1.5, tv(cy, ROW_H, 7.5));
    // ATS
    setFont(doc, "bold", 7.5, C.orange);
    doc.text(String(Math.round(c.atsScore)),        ML + 126 + 14, tv(cy, ROW_H, 7.5), { align: "right" });
    // Suit
    setFont(doc, "bold", 7.5, C.blue);
    doc.text(String(Math.round(c.suitabilityScore)),ML + 142 + 14, tv(cy, ROW_H, 7.5), { align: "right" });
    // Score
    setFont(doc, "bold", 7.5, C.dark);
    doc.text(String(Math.round(comp)),              ML + 158 + 14, tv(cy, ROW_H, 7.5), { align: "right" });
    // Verdict
    const v   = comp >= 70 ? "Proceed" : comp >= 45 ? "Consider" : "Not Suitable";
    const vc  = comp >= 70 ? C.green   : comp >= 45 ? C.orange   : C.red;
    setFont(doc, "bold", 7, vc);
    doc.text(v, ML + 175 + 1.5, tv(cy, ROW_H, 7));

    cy += ROW_H;
  });

  // Cover footer
  fill(doc, C.blue);
  doc.rect(0, PH - FOOTER_H, PW, FOOTER_H, "F");
  setFont(doc, "bold", 7.5, C.white);
  doc.text("Screened through Uttarayan", ML, PH - 4);
  setFont(doc, "normal", 7.5, C.white);
  doc.text(`Ref: ${jobRefNumber} · ${jobTitle}`, PW / 2, PH - 4, { align: "center" });
  doc.text("1", PW - MR, PH - 4, { align: "right" });

  /* ─── INDIVIDUAL CANDIDATE PAGES ─── */
  for (const candidate of sorted) {
    doc.addPage();
    renderCandidate(doc, candidate, logo);
  }

  doc.save(`${jobRefNumber}_all_candidates_report.pdf`);
}
