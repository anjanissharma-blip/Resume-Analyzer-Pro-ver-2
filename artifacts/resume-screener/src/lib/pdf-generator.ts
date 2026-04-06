import jsPDF from "jspdf";

/* ════════════════════════════════════════════════════════════
   BRAND  &  LAYOUT CONSTANTS
═══════════════════════════════════════════════════════════════ */
const C = {
  orange:  [224, 120,  32] as C3,
  orangeL: [255, 237, 213] as C3,   // light orange tint
  blue:    [ 55,  96, 210] as C3,
  blueL:   [235, 242, 255] as C3,   // light blue tint
  dark:    [ 22,  30,  50] as C3,
  grey:    [100, 112, 132] as C3,
  greyL:   [235, 237, 242] as C3,
  white:   [255, 255, 255] as C3,
  green:   [ 18, 143,  62] as C3,
  greenL:  [218, 250, 232] as C3,
  red:     [180,  28,  28] as C3,
  redL:    [254, 226, 226] as C3,
  warmOff: [255, 248, 238] as C3,
};
type C3 = [number, number, number];

const PW = 210, PH = 297;     // A4
const ML = 13, MR = 13;       // left / right margin
const CW = PW - ML - MR;      // 184 mm usable width
const FTR = 13;                // footer strip height
const SAFE = PH - FTR - 6;    // last safe Y before footer

/* ════════════════════════════════════════════════════════════
   PRIMITIVE  HELPERS
═══════════════════════════════════════════════════════════════ */
// Vertical-centre baseline for text inside a box
const tvc = (by: number, bh: number, fs: number) =>
  by + bh / 2 + fs * 0.352778 * 0.38;

const f   = (d: jsPDF, c: C3) => d.setFillColor(...c);
const s   = (d: jsPDF, c: C3) => d.setDrawColor(...c);
const lw  = (d: jsPDF, w: number) => d.setLineWidth(w);

function t(d: jsPDF, weight: "normal" | "bold", size: number, color: C3) {
  d.setFont("helvetica", weight);
  d.setFontSize(size);
  d.setTextColor(...color);
}

/* ════════════════════════════════════════════════════════════
   PAGE-BREAK  GUARD
   Calls footerFn on current page, adds new page, returns new y
═══════════════════════════════════════════════════════════════ */
function guard(doc: jsPDF, y: number, need: number, logo: string | null, footerFn: () => void): number {
  if (y + need <= SAFE) return y;
  footerFn();
  doc.addPage();
  if (logo) doc.addImage(logo, "JPEG", PW - MR - 15, 3, 13, 13, undefined, "FAST");
  // thin orange top strip on continuation pages
  f(doc, C.orange); doc.rect(0, 0, PW, 2, "F");
  return 18;
}

/* ════════════════════════════════════════════════════════════
   SECTION  HEADER
   Left colour bar + bold label. Returns y below header.
═══════════════════════════════════════════════════════════════ */
function secHead(doc: jsPDF, title: string, col: C3, y: number): number {
  const BH = 7.5, BW = 3.2;
  f(doc, col); doc.rect(ML, y, BW, BH, "F");
  // faint bg strip
  f(doc, [col[0], col[1], col[2]] as C3);
  doc.setFillColor(col[0], col[1], col[2], 0.07);
  doc.rect(ML + BW, y, CW - BW, BH, "F");
  t(doc, "bold", 8, col);
  doc.text(title, ML + BW + 3, tvc(y, BH, 8));
  return y + BH + 2;
}

/* ════════════════════════════════════════════════════════════
   SKILL  PILLS
   Wraps pills across rows. Returns y below last row.
═══════════════════════════════════════════════════════════════ */
function pills(doc: jsPDF, skills: string[], x0: number, y0: number, maxW: number,
               tc: C3, bg: C3): number {
  const PH_P = 6, PX = 3, GX = 2.5, GY = 2.5, FS = 7.5;
  t(doc, "normal", FS, tc); s(doc, tc); lw(doc, 0.3);
  let x = x0, y = y0;
  for (const sk of skills) {
    const pw = doc.getTextWidth(sk) + PX * 2;
    if (x + pw > x0 + maxW + 0.5) { x = x0; y += PH_P + GY; }
    f(doc, bg); doc.roundedRect(x, y, pw, PH_P, 1.3, 1.3, "FD");
    doc.setTextColor(...tc); doc.text(sk, x + PX, tvc(y, PH_P, FS));
    x += pw + GX;
  }
  return y + PH_P;
}

/* ════════════════════════════════════════════════════════════
   WRAPPED  BODY  TEXT
   Renders wrapped text, returns y below last line.
═══════════════════════════════════════════════════════════════ */
function body(doc: jsPDF, text: string, y: number, maxW = CW, fs = 8.5, lh = 5, maxLines = 10): number {
  t(doc, "normal", fs, C.dark);
  const lines = (doc.splitTextToSize(text || "N/A", maxW) as string[]).slice(0, maxLines);
  lines.forEach((line, i) => doc.text(line, ML, y + i * lh + fs * 0.352778 * 0.4));
  return y + lines.length * lh;
}

/* ════════════════════════════════════════════════════════════
   SCORE  BADGE  (for header)
═══════════════════════════════════════════════════════════════ */
function scoreBadge(doc: jsPDF, x: number, y: number, w: number, h: number,
                    score: number, label: string, numColor: C3) {
  f(doc, C.white); lw(doc, 0.4); s(doc, [220, 220, 220] as C3);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
  t(doc, "bold", 15, numColor);
  doc.text(String(Math.round(score)), x + w / 2, y + h * 0.55, { align: "center" });
  t(doc, "bold", 5.5, C.grey);
  doc.text(label, x + w / 2, y + h - 2.5, { align: "center" });
}

/* ════════════════════════════════════════════════════════════
   EXPERIENCE  ENTRY  CARD
   Returns new y after the card.
═══════════════════════════════════════════════════════════════ */
function expCard(doc: jsPDF, title: string, company: string,
                 duration: string, description: string, y: number,
                 logo: string | null, footerFn: () => void): number {
  const PAD   = 3.5;
  const LW_BAR = 2.5;
  const FS_TITLE = 8.5, FS_CO = 8, FS_BODY = 7.8, LH = 4.7;

  // Estimate height needed
  const bodyW   = CW - LW_BAR - PAD * 2;
  const descLines = description
    ? (doc.splitTextToSize(description, bodyW) as string[]).slice(0, 5)
    : [];
  const cardH = 5.5 + 5 + (descLines.length > 0 ? descLines.length * LH + 1 : 0) + PAD;

  y = guard(doc, y, cardH + 2, logo, footerFn);

  // Card background
  f(doc, [248, 249, 253] as C3);
  doc.rect(ML, y, CW, cardH, "F");
  // Left colour bar
  f(doc, C.blue);
  doc.rect(ML, y, LW_BAR, cardH, "F");

  let cy = y + PAD;
  // Title
  t(doc, "bold", FS_TITLE, C.dark);
  doc.text(title || "Unknown Role", ML + LW_BAR + PAD, cy + FS_TITLE * 0.352778 * 0.4);
  // Duration right-aligned
  if (duration) {
    t(doc, "normal", 7.5, C.grey);
    doc.text(duration, ML + CW - 1, cy + FS_TITLE * 0.352778 * 0.4, { align: "right" });
  }
  cy += 5.5;

  // Company
  t(doc, "bold", FS_CO, C.blue);
  doc.text(company || "", ML + LW_BAR + PAD, cy + FS_CO * 0.352778 * 0.4);
  cy += 5;

  // Description
  if (descLines.length > 0) {
    t(doc, "normal", FS_BODY, C.grey);
    descLines.forEach((line, i) => doc.text(line, ML + LW_BAR + PAD, cy + i * LH + FS_BODY * 0.352778 * 0.4));
    cy += descLines.length * LH + 1;
  }

  return y + cardH + 2.5; // gap after card
}

/* ════════════════════════════════════════════════════════════
   EXPORTED  TYPE
═══════════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════════
   CORE RENDER — one candidate onto the current page
═══════════════════════════════════════════════════════════════ */
function renderCandidate(doc: jsPDF, data: ReportData, logo: string | null): void {
  const composite  = (data.atsScore + data.suitabilityScore) / 2;
  const startPage  = (doc as any).internal.getNumberOfPages();
  let   currentPage = startPage;

  /* ── footer draws on whichever page is active ── */
  const footer = () => {
    const p = (doc as any).internal.getNumberOfPages();
    f(doc, C.blue); doc.rect(0, PH - FTR, PW, FTR, "F");
    t(doc, "bold", 7.5, C.white);
    doc.text("Screened through Uttarayan", ML, PH - 4.5);
    t(doc, "normal", 7.5, C.white);
    doc.text(`Ref: ${data.jobRefNumber}  ·  ${data.jobTitle}`, PW / 2, PH - 4.5, { align: "center" });
    doc.text(String(p), PW - MR, PH - 4.5, { align: "right" });
    currentPage = p;
  };

  const gd = (y: number, need: number) => guard(doc, y, need, logo, footer);

  /* ════════════════════════
     HEADER  (orange bar)
  ═══════════════════════════ */
  const HDR = 34;
  f(doc, C.orange); doc.rect(0, 0, PW, HDR, "F");
  f(doc, C.blue);   doc.rect(0, HDR, PW, 2.5, "F");

  // Logo — top right corner
  if (logo) doc.addImage(logo, "JPEG", PW - MR - 22, 4, 22, 22, undefined, "FAST");

  // ── Two score badges side by side, left of logo ──
  const BADGE_H = 22, BADGE_W = 21, BADGE_GAP = 3;
  const badge2X = PW - MR - 22 - BADGE_GAP - BADGE_W;
  const badge1X = badge2X - BADGE_GAP - BADGE_W;

  scoreBadge(doc, badge1X, 5.5, BADGE_W, BADGE_H, data.atsScore, "ATS SCORE",  C.orange);
  scoreBadge(doc, badge2X, 5.5, BADGE_W, BADGE_H, composite,     "COMPOSITE",  C.blue);

  // Candidate name + email + assessed job
  const nameW = badge1X - ML - 6;
  t(doc, "bold", 13, C.white);
  const nameLines = doc.splitTextToSize(data.candidateName || "Unknown Candidate", nameW) as string[];
  doc.text(nameLines[0], ML, 13);
  t(doc, "normal", 8, [255, 220, 185] as C3);
  doc.text(data.candidateEmail || "", ML, 21);
  t(doc, "normal", 7.5, [255, 200, 155] as C3);
  const jobLine = `${data.jobRefNumber}  ·  ${data.jobTitle}${data.jobDepartment ? `  ·  ${data.jobDepartment}` : ""}`;
  doc.text(jobLine.substring(0, 55), ML, 29);

  /* ════════════════════════
     REPORT META  ROW
  ═══════════════════════════ */
  let y = HDR + 6;
  t(doc, "bold", 7, C.grey);
  doc.text("CANDIDATE PROFILE REPORT", ML, y);
  t(doc, "normal", 7, C.grey);
  const genDate = new Date(data.reportGeneratedAt)
    .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`Generated: ${genDate}`, PW - MR, y, { align: "right" });
  y += 5;

  /* ════════════════════════
     CONTACT DETAILS  BOX
  ═══════════════════════════ */
  {
    const BH = 15, PAD = 3.5;
    f(doc, C.orangeL); doc.rect(ML, y, CW, BH, "F");
    t(doc, "bold", 6.5, C.orange); doc.text("CONTACT DETAILS", ML + PAD, y + 4.2);
    const cols = [
      { k: "Phone",   v: data.candidatePhone   || "Not specified" },
      { k: "Email",   v: data.candidateEmail   || "Not specified" },
      { k: "Address", v: data.candidateAddress || "Not specified" },
    ];
    const colW = CW / 3, ry = y + 9.5;
    cols.forEach(({ k, v }, i) => {
      const cx = ML + PAD + i * colW;
      t(doc, "bold", 7, C.grey); const kw = doc.getTextWidth(k + ": "); doc.text(k + ": ", cx, ry);
      t(doc, "normal", 7.5, C.dark);
      doc.text((doc.splitTextToSize(v, colW - kw - 3) as string[])[0], cx + kw, ry);
    });
    y += BH + 2;
  }

  /* ════════════════════════
     ASSESSED FOR  BOX
  ═══════════════════════════ */
  {
    const BH = 15, PAD = 3.5;
    f(doc, C.blueL); doc.rect(ML, y, CW, BH, "F");
    t(doc, "bold", 6.5, C.blue); doc.text("ASSESSED FOR", ML + PAD, y + 4.2);
    const ry = y + 9.5, hw = CW / 2;
    t(doc, "bold", 7, C.grey); const r1w = doc.getTextWidth("Reference No: "); doc.text("Reference No: ", ML + PAD, ry);
    t(doc, "normal", 7.5, C.dark); doc.text(data.jobRefNumber, ML + PAD + r1w, ry);
    t(doc, "bold", 7, C.grey); const r2w = doc.getTextWidth("Job Title: "); doc.text("Job Title: ", ML + PAD + hw, ry);
    t(doc, "normal", 7.5, C.dark);
    const jobStr = data.jobTitle + (data.jobDepartment ? ` · ${data.jobDepartment}` : "");
    doc.text((doc.splitTextToSize(jobStr, hw - r2w - 3) as string[])[0], ML + PAD + hw + r2w, ry);
    y += BH + 2;
  }

  /* ════════════════════════
     SUITABILITY + EXPERIENCE  TWIN BOXES
  ═══════════════════════════ */
  {
    const BH = 18, GAP = 3, BW = (CW - GAP) / 2;
    const suitLabel =
      data.suitabilityScore >= 75 ? "Highly Suitable" :
      data.suitabilityScore >= 55 ? "Suitable" :
      data.suitabilityScore >= 35 ? "Partially Suitable" : "Not Suitable";
    const expYrs = data.experienceYears != null ? data.experienceYears.toFixed(1) : "N/A";

    // Left: suitability
    f(doc, C.orange); doc.rect(ML, y, BW, BH, "F");
    t(doc, "bold", 6.5, C.white); doc.text("SUITABILITY RATING", ML + BW / 2, y + 5.5, { align: "center" });
    t(doc, "bold", 11, C.white);  doc.text(suitLabel, ML + BW / 2, y + 13.5, { align: "center" });

    // Right: experience years
    f(doc, C.blue); doc.rect(ML + BW + GAP, y, BW, BH, "F");
    t(doc, "bold", 6.5, C.white); doc.text("EXPERIENCE (YEARS)", ML + BW + GAP + BW / 2, y + 5.5, { align: "center" });
    t(doc, "bold", 11, C.white);  doc.text(expYrs, ML + BW + GAP + BW / 2, y + 13.5, { align: "center" });
    y += BH + 4;
  }

  /* ════════════════════════
     CANDIDATE PROFILE SUMMARY
  ═══════════════════════════ */
  y = gd(y, 35);
  y = secHead(doc, "CANDIDATE PROFILE SUMMARY", C.orange, y);
  y = body(doc, data.aiSummary, y, CW, 8.5, 5, 8);
  y += 3;

  /* ════════════════════════
     EDUCATIONAL QUALIFICATIONS
  ═══════════════════════════ */
  const edus = (data.education || []).filter(e => e.degree || e.institution);
  if (edus.length > 0) {
    y = gd(y, 12 + edus.length * 5.5);
    y = secHead(doc, "EDUCATIONAL QUALIFICATIONS", C.blue, y);
    for (const e of edus.slice(0, 5)) {
      const line = [e.degree, e.institution, e.year].filter(Boolean).join("   ·   ");
      t(doc, "normal", 8, C.dark);
      doc.text("•", ML + 1, y + 3.5);
      t(doc, "bold", 8, C.dark);
      doc.text(line || "", ML + 5, y + 3.5);
      y += 5.5;
    }
    y += 2;
  }

  /* ════════════════════════
     EXPERIENCE ASSESSMENT  (full section)
     1. Overall assessment paragraph
     2. Suitability to role analysis
     3. Individual job entries
  ═══════════════════════════ */
  y = gd(y, 40);
  y = secHead(doc, "EXPERIENCE ASSESSMENT", C.blue, y);

  // Overall assessment paragraph (experienceMatch)
  if (data.experienceMatch && data.experienceMatch !== "N/A") {
    y = body(doc, data.experienceMatch, y, CW, 8.5, 5, 8);
    y += 4;
  }

  // Suitability to role sub-header
  y = gd(y, 20);
  {
    const SBH = 7;
    f(doc, C.orangeL); doc.rect(ML, y, CW, SBH, "F");
    t(doc, "bold", 7.5, C.orange);
    doc.text("SUITABILITY TO ROLE", ML + 3.5, tvc(y, SBH, 7.5));
    // Suitability score inline
    const score = Math.round(data.suitabilityScore);
    const scoreColor: C3 = score >= 70 ? C.green : score >= 45 ? C.orange : C.red;
    t(doc, "bold", 8, scoreColor);
    doc.text(`${score}/100`, PW - MR - 1, tvc(y, SBH, 8), { align: "right" });
    y += SBH + 3;
  }

  // Extract suitability reasoning: use later paragraphs of aiSummary
  {
    const paras = (data.aiSummary || "")
      .split(/\n+/)
      .map(p => p.trim())
      .filter(Boolean);

    // Take paras that seem to be about fit/suitability/recommendation (skip first 1-2 intro paras)
    const suitParas = paras.length > 2 ? paras.slice(Math.max(1, paras.length - 3)) : paras;
    const suitText = suitParas.join(" ");
    y = body(doc, suitText, y, CW, 8.5, 5, 7);
    y += 4;
  }

  // Individual experience entries
  const exps = (data.experience || []).filter(e => e.title || e.company);
  if (exps.length > 0) {
    y = gd(y, 18);
    {
      const EHH = 6;
      f(doc, C.greyL); doc.rect(ML, y, CW, EHH, "F");
      t(doc, "bold", 7.5, C.grey);
      doc.text("WORK HISTORY", ML + 3.5, tvc(y, EHH, 7.5));
      y += EHH + 2;
    }
    for (const exp of exps.slice(0, 6)) {
      y = expCard(
        doc,
        exp.title || "", exp.company || "",
        exp.duration || "", exp.description || "",
        y, logo, footer
      );
    }
    y += 1;
  }

  /* ════════════════════════
     MATCHING SKILLS
  ═══════════════════════════ */
  const ms = data.matchingSkills || [];
  if (ms.length > 0) {
    const rows = Math.ceil(ms.length / 7);
    y = gd(y, 12 + rows * 10);
    y = secHead(doc, `MATCHING SKILLS   (${ms.length})`, C.green, y);
    y = pills(doc, ms, ML, y, CW, C.green, C.greenL);
    y += 4;
  }

  /* ════════════════════════
     SKILLS GAP
  ═══════════════════════════ */
  const sg = data.skillGaps || [];
  if (sg.length > 0) {
    const rows = Math.ceil(sg.length / 7);
    y = gd(y, 12 + rows * 10);
    y = secHead(doc, `SKILLS GAP   (${sg.length})`, C.red, y);
    y = pills(doc, sg, ML, y, CW, C.red, C.redL);
    y += 4;
  }

  /* ════════════════════════
     RECOMMENDATION
  ═══════════════════════════ */
  const recVerdict =
    composite >= 70 ? "Proceed to Interview / Hire Shortlist" :
    composite >= 45 ? "Consider for Interview" :
    "Does Not Meet Requirements";

  const verdictColor: C3 = composite >= 70 ? C.green : composite >= 45 ? C.orange : C.red;
  const verdictBg: C3   = composite >= 70 ? C.greenL : composite >= 45 ? C.warmOff : C.redL;

  // Use last paragraph of aiSummary as recommendation detail
  const aiParas = (data.aiSummary || "").split(/\n+/).map(p => p.trim()).filter(Boolean);
  const recDetail = aiParas.length > 0 ? aiParas[aiParas.length - 1] : "Based on the screening assessment.";
  const recLines  = doc.splitTextToSize(recDetail, CW - 32) as string[];
  const cappedRec = recLines.slice(0, 5);
  const REC_BOX_H = Math.max(40, cappedRec.length * 5 + 24);

  y = gd(y, REC_BOX_H + 14);
  y = secHead(doc, "RECOMMENDATION", C.orange, y);

  // Box
  f(doc, verdictBg); s(doc, verdictColor); lw(doc, 0.5);
  doc.roundedRect(ML, y, CW, REC_BOX_H, 2.5, 2.5, "FD");

  // Verdict label
  t(doc, "bold", 11, verdictColor);
  doc.text(recVerdict, ML + 5, y + 11);

  // Detail text
  t(doc, "normal", 8.5, C.dark);
  cappedRec.forEach((line, i) => doc.text(line, ML + 5, y + 19 + i * 5));

  // Score pill
  const PX_OFF = CW - 30, PW_P = 25, PH_P = 26;
  f(doc, verdictColor);
  doc.roundedRect(ML + PX_OFF, y + 4, PW_P, PH_P, 3, 3, "F");
  t(doc, "bold", 17, C.white);
  doc.text(String(Math.round(composite)), ML + PX_OFF + PW_P / 2, y + 4 + PH_P * 0.55, { align: "center" });
  t(doc, "bold", 5.5, C.white);
  doc.text("COMPOSITE", ML + PX_OFF + PW_P / 2, y + 4 + PH_P - 3, { align: "center" });
  y += REC_BOX_H + 4;

  /* ════════════════════════
     SCORE  SUMMARY  BAR
  ═══════════════════════════ */
  y = gd(y, 18);
  const scoreItems = [
    { label: "ATS Score",    value: data.atsScore,           color: C.orange },
    { label: "Suitability",  value: data.suitabilityScore,   color: C.blue   },
    { label: "Composite",    value: composite,               color: verdictColor },
  ];
  const SW = (CW - 6) / 3;
  scoreItems.forEach(({ label, value, color }, i) => {
    const bx = ML + i * (SW + 3);
    const BH = 15;
    // Background with subtle left border
    f(doc, [248, 249, 252] as C3); doc.rect(bx, y, SW, BH, "F");
    f(doc, color); doc.rect(bx, y, 2.5, BH, "F");
    t(doc, "bold", 13, color);
    doc.text(String(Math.round(value)), bx + SW / 2, y + 9, { align: "center" });
    t(doc, "normal", 6.5, C.grey);
    doc.text(label, bx + SW / 2, y + 13.5, { align: "center" });
  });

  footer();
}

/* ════════════════════════════════════════════════════════════
   COVER PAGE  helpers
═══════════════════════════════════════════════════════════════ */
function renderCoverPage(
  doc: jsPDF, candidates: ReportData[], jobTitle: string,
  jobRefNumber: string, logo: string | null
): void {
  const sorted = [...candidates].sort((a, b) =>
    ((b.atsScore + b.suitabilityScore) / 2) - ((a.atsScore + a.suitabilityScore) / 2)
  );

  // Header
  const HDR = 48;
  f(doc, C.orange); doc.rect(0, 0, PW, HDR, "F");
  f(doc, C.blue);   doc.rect(0, HDR, PW, 3, "F");
  if (logo) doc.addImage(logo, "JPEG", ML, 9, 30, 30, undefined, "FAST");

  t(doc, "bold", 20, C.white); doc.text("Candidate Batch Report", ML + 38, 22);
  t(doc, "bold", 10, [255, 215, 175] as C3);
  doc.text(`${jobRefNumber}  ·  ${jobTitle}`, ML + 38, 33);

  let cy = HDR + 10;
  t(doc, "normal", 8.5, C.dark);
  const gd2 = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`Generated: ${gd2}`, ML, cy);
  doc.text(`Total Candidates: ${candidates.length}`, ML + 75, cy);
  cy += 10;

  // Table heading
  t(doc, "bold", 8.5, C.orange); doc.text("CANDIDATE RANKING SUMMARY", ML, cy); cy += 6;

  // Column defs: [xOffset, width, label, align]
  type Col = [number, number, string, "left" | "right"];
  const cols: Col[] = [
    [  0,   8,  "#",        "right" ],
    [ 10,  58,  "Name",     "left"  ],
    [ 71,  52,  "Email",    "left"  ],
    [126,  14,  "ATS",      "right" ],
    [142,  14,  "Suit.",    "right" ],
    [158,  16,  "Score",    "right" ],
    [176,  24,  "Verdict",  "left"  ],
  ];
  const RH = 7.5;

  // Header row
  f(doc, C.blue); doc.rect(ML, cy, CW, RH, "F");
  t(doc, "bold", 7, C.white);
  cols.forEach(([dx, dw, label, align]) =>
    doc.text(label, align === "right" ? ML + dx + dw : ML + dx + 1.5, tvc(cy, RH, 7), { align }));
  cy += RH;

  // Data rows
  sorted.forEach((c, idx) => {
    const comp = (c.atsScore + c.suitabilityScore) / 2;
    const bg: C3 = idx % 2 === 0 ? [252, 249, 245] : C.white;
    f(doc, bg); doc.rect(ML, cy, CW, RH, "F");

    t(doc, "normal", 7.5, C.dark);
    doc.text(String(idx + 1), ML + 8, tvc(cy, RH, 7.5), { align: "right" });
    doc.text((c.candidateName || "Unknown").substring(0, 26), ML + 10 + 1.5, tvc(cy, RH, 7.5));
    doc.text((c.candidateEmail || "").substring(0, 28), ML + 71 + 1.5, tvc(cy, RH, 7.5));

    t(doc, "bold", 7.5, C.orange);
    doc.text(String(Math.round(c.atsScore)),          ML + 126 + 14, tvc(cy, RH, 7.5), { align: "right" });
    t(doc, "bold", 7.5, C.blue);
    doc.text(String(Math.round(c.suitabilityScore)),  ML + 142 + 14, tvc(cy, RH, 7.5), { align: "right" });
    t(doc, "bold", 7.5, C.dark);
    doc.text(String(Math.round(comp)),                ML + 158 + 16, tvc(cy, RH, 7.5), { align: "right" });

    const v  = comp >= 70 ? "Proceed" : comp >= 45 ? "Consider" : "Not Suitable";
    const vc = comp >= 70 ? C.green : comp >= 45 ? C.orange : C.red;
    t(doc, "bold", 7, vc);
    doc.text(v, ML + 176 + 1.5, tvc(cy, RH, 7));
    cy += RH;
  });

  // Cover footer
  f(doc, C.blue); doc.rect(0, PH - FTR, PW, FTR, "F");
  t(doc, "bold", 7.5, C.white); doc.text("Screened through Uttarayan", ML, PH - 4.5);
  t(doc, "normal", 7.5, C.white);
  doc.text(`Ref: ${jobRefNumber} · ${jobTitle}`, PW / 2, PH - 4.5, { align: "center" });
  doc.text("1", PW - MR, PH - 4.5, { align: "right" });
}

/* ════════════════════════════════════════════════════════════
   PUBLIC  API
═══════════════════════════════════════════════════════════════ */
export async function generateCandidatePDF(data: ReportData): Promise<void> {
  const logo = await getLogo();
  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  renderCandidate(doc, data, logo);
  const fname = `${data.jobRefNumber}_${(data.candidateName || "candidate").replace(/\s+/g, "_")}.pdf`;
  doc.save(fname);
}

export async function generateAllCandidatesPDF(
  candidates: ReportData[], jobTitle: string, jobRefNumber: string
): Promise<void> {
  const logo   = await getLogo();
  const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const sorted = [...candidates].sort((a, b) =>
    ((b.atsScore + b.suitabilityScore) / 2) - ((a.atsScore + a.suitabilityScore) / 2)
  );

  renderCoverPage(doc, sorted, jobTitle, jobRefNumber, logo);

  for (const candidate of sorted) {
    doc.addPage();
    renderCandidate(doc, candidate, logo);
  }

  doc.save(`${jobRefNumber}_all_candidates_report.pdf`);
}
