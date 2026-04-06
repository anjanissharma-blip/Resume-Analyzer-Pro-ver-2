import jsPDF from "jspdf";

/* ═══════════════════════════════════════════════════════
   BRAND  PALETTE  (no pure black anywhere)
═══════════════════════════════════════════════════════ */
type C3 = [number, number, number];
const C = {
  orange:  [224, 120,  32] as C3,   // primary accent
  orangeL: [255, 237, 213] as C3,   // light orange card bg
  blue:    [ 55,  96, 210] as C3,   // secondary accent
  blueL:   [235, 242, 255] as C3,   // light blue card bg
  navy:    [ 22,  36,  64] as C3,   // body text (dark navy, not black)
  slate:   [ 72,  85, 110] as C3,   // secondary text
  muted:   [120, 132, 155] as C3,   // muted labels
  rule:    [210, 215, 228] as C3,   // card border colour
  pageBg:  [248, 249, 252] as C3,   // page background
  white:   [255, 255, 255] as C3,
  green:   [ 18, 143,  62] as C3,
  greenL:  [220, 252, 232] as C3,
  red:     [175,  28,  28] as C3,
  redL:    [254, 228, 228] as C3,
  warmOff: [255, 248, 238] as C3,
};

/* ═══════════════════════════════════════════════════════
   PAGE  GEOMETRY
═══════════════════════════════════════════════════════ */
const PW   = 210;             // A4 width  mm
const PH   = 297;             // A4 height mm
const ML   = 12;              // left  margin
const MR   = 12;              // right margin
const CW   = PW - ML - MR;   // content width  (186 mm)
const FTR  = 12;              // footer height
const SAFE = PH - FTR - 4;   // last safe Y

/* ═══════════════════════════════════════════════════════
   PRIMITIVE  SETTERS
═══════════════════════════════════════════════════════ */
const f  = (d: jsPDF, c: C3) => d.setFillColor(...c);
const s  = (d: jsPDF, c: C3) => d.setDrawColor(...c);
const lw = (d: jsPDF, w: number) => d.setLineWidth(w);
const tc = (d: jsPDF, c: C3) => d.setTextColor(...c);

function ft(d: jsPDF, w: "normal" | "bold", sz: number, col: C3) {
  d.setFont("helvetica", w);
  d.setFontSize(sz);
  tc(d, col);
}

// Vertical-centre baseline of text inside a box
const vcb = (by: number, bh: number, fs: number) =>
  by + bh / 2 + fs * 0.352778 * 0.37;

/* ═══════════════════════════════════════════════════════
   CARD  HELPERS
   drawCard  – white rounded rect with subtle border
   cardHead  – coloured title strip inside card (returns bodyY)
═══════════════════════════════════════════════════════ */
function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number, bg: C3 = C.white) {
  f(doc, bg); s(doc, C.rule); lw(doc, 0.3);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
}

const CARD_TH  = 9;   // card title strip height
const CARD_PAD = 4.5; // padding inside card body

// Draws card + coloured title strip. Returns Y of first body line.
function cardHead(doc: jsPDF, title: string, accent: C3,
                  x: number, y: number, w: number, h: number): number {
  drawCard(doc, x, y, w, h);
  // coloured header strip: rounded at top, squared at bottom
  f(doc, accent);
  doc.roundedRect(x, y, w, CARD_TH + 3, 2.5, 2.5, "F");
  doc.rect(x, y + CARD_TH - 0.5, w, 3.5, "F");
  ft(doc, "bold", 8, C.white);
  doc.text(title, x + w / 2, vcb(y, CARD_TH, 8), { align: "center" });
  return y + CARD_TH + CARD_PAD;
}

/* ═══════════════════════════════════════════════════════
   SECTION  HEADING  (for flowing multi-page sections)
   Full-width coloured bar with white title text.
═══════════════════════════════════════════════════════ */
function secBar(doc: jsPDF, title: string, accent: C3, y: number): number {
  const BH = 8.5;
  f(doc, accent); doc.rect(ML, y, CW, BH, "F");
  ft(doc, "bold", 8, C.white);
  doc.text(title, PW / 2, vcb(y, BH, 8), { align: "center" });
  return y + BH + 3;
}

// Lighter sub-section bar
function subBar(doc: jsPDF, title: string, accent: C3, y: number, rightText?: string): number {
  const BH = 7;
  f(doc, [accent[0], accent[1], accent[2]] as C3);
  // tinted bg
  const tint: C3 = [
    Math.round(accent[0] * 0.15 + 255 * 0.85),
    Math.round(accent[1] * 0.15 + 255 * 0.85),
    Math.round(accent[2] * 0.15 + 255 * 0.85),
  ];
  f(doc, tint); s(doc, C.rule); lw(doc, 0.25);
  doc.rect(ML, y, CW, BH, "FD");
  // left accent bar
  f(doc, accent); doc.rect(ML, y, 3, BH, "F");
  ft(doc, "bold", 7.5, accent);
  doc.text(title, ML + 6, vcb(y, BH, 7.5));
  if (rightText) {
    ft(doc, "bold", 7.5, accent);
    doc.text(rightText, ML + CW - 1, vcb(y, BH, 7.5), { align: "right" });
  }
  return y + BH + 3;
}

/* ═══════════════════════════════════════════════════════
   PAGE-BREAK  GUARD
═══════════════════════════════════════════════════════ */
function guard(doc: jsPDF, y: number, need: number,
               logo: string | null, footerFn: () => void): number {
  if (y + need <= SAFE) return y;
  footerFn();
  doc.addPage();
  f(doc, C.pageBg); doc.rect(0, 0, PW, PH, "F");
  f(doc, C.orange); doc.rect(0, 0, PW, 2.5, "F");
  if (logo) doc.addImage(logo, "JPEG", PW - MR - 14, 4, 12, 12, undefined, "FAST");
  return 18;
}

/* ═══════════════════════════════════════════════════════
   WRAPPED  BODY  TEXT  (adaptive — no hard line limit)
   Returns y below last line.
═══════════════════════════════════════════════════════ */
function bodyText(doc: jsPDF, text: string, x: number, y: number,
                  maxW: number, fs = 8.5, lh = 5.2): number {
  const lines = doc.splitTextToSize(text || "Not available.", maxW) as string[];
  ft(doc, "normal", fs, C.navy);
  lines.forEach((line, i) => {
    const isLast = i === lines.length - 1;
    doc.text(line, x, y + i * lh + fs * 0.352778 * 0.35,
      { align: isLast ? "left" : "justify", maxWidth: maxW });
  });
  return y + lines.length * lh;
}

// Measure how tall bodyText will be (without drawing)
function measureBody(doc: jsPDF, text: string, maxW: number, fs = 8.5, lh = 5.2): number {
  const lines = doc.splitTextToSize(text || ".", maxW) as string[];
  return lines.length * lh;
}

/* ═══════════════════════════════════════════════════════
   SKILL  PILLS
   Returns y below last pill row.
═══════════════════════════════════════════════════════ */
function pillRow(doc: jsPDF, skills: string[], x0: number, y0: number,
                 maxW: number, fg: C3, bg: C3): number {
  const PH_P = 6.5, PX = 3.5, GX = 2.5, GY = 2.5, FS = 7.5;
  ft(doc, "normal", FS, fg); s(doc, fg); lw(doc, 0.3);
  let x = x0, y = y0;
  for (const sk of skills) {
    const pw = doc.getTextWidth(sk) + PX * 2;
    if (x + pw > x0 + maxW + 0.5) { x = x0; y += PH_P + GY; }
    f(doc, bg); doc.roundedRect(x, y, pw, PH_P, 1.5, 1.5, "FD");
    tc(doc, fg); doc.text(sk, x + PX, vcb(y, PH_P, FS));
    x += pw + GX;
  }
  return y + PH_P;
}

function measurePills(doc: jsPDF, skills: string[], maxW: number): number {
  const PH_P = 6.5, PX = 3.5, GX = 2.5, GY = 2.5, FS = 7.5;
  doc.setFontSize(FS);
  let x = 0, y = 0;
  for (const sk of skills) {
    const pw = doc.getTextWidth(sk) + PX * 2;
    if (x + pw > maxW + 0.5) { x = 0; y += PH_P + GY; }
    x += pw + GX;
  }
  return y + PH_P;
}

/* ═══════════════════════════════════════════════════════
   SCORE  BADGE  (header area)
═══════════════════════════════════════════════════════ */
function scoreBadge(doc: jsPDF, x: number, y: number, w: number, h: number,
                    score: number, label: string, numCol: C3) {
  f(doc, C.white); s(doc, C.rule); lw(doc, 0.35);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
  ft(doc, "bold", 16, numCol);
  doc.text(String(Math.round(score)), x + w / 2, y + h * 0.56, { align: "center" });
  ft(doc, "bold", 5.5, C.muted);
  doc.text(label, x + w / 2, y + h - 2.8, { align: "center" });
}

/* ═══════════════════════════════════════════════════════
   EXPORTED  TYPES
═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   BUILD  COMPREHENSIVE  EXPERIENCE  NARRATIVE
   Synthesises experienceMatch + every job's description
   into a single flowing analysis text.
═══════════════════════════════════════════════════════ */
function buildExpNarrative(data: ReportData): string {
  const parts: string[] = [];

  if (data.experienceMatch && data.experienceMatch.trim() && data.experienceMatch !== "N/A") {
    parts.push(data.experienceMatch.trim());
  }

  const jobs = (data.experience || []).filter(e => e.description);
  for (const job of jobs) {
    const role    = [job.title, job.company ? `at ${job.company}` : ""].filter(Boolean).join(" ");
    const dur     = job.duration ? ` (${job.duration})` : "";
    const prefix  = role ? `${role}${dur}: ` : "";
    parts.push(`${prefix}${job.description!.trim()}`);
  }

  return parts.join("\n\n") || "No detailed experience information available.";
}

/* ═══════════════════════════════════════════════════════
   CORE  RENDERER  — one candidate
═══════════════════════════════════════════════════════ */
function renderCandidate(doc: jsPDF, data: ReportData, logo: string | null): void {
  const composite = (data.atsScore + data.suitabilityScore) / 2;

  // Page background
  f(doc, C.pageBg); doc.rect(0, 0, PW, PH, "F");

  /* ── footer closure ── */
  const footer = () => {
    const p = (doc as any).internal.getNumberOfPages();
    f(doc, C.blue); doc.rect(0, PH - FTR, PW, FTR, "F");
    ft(doc, "bold", 7.5, C.white);
    doc.text("Screened through Uttarayan", ML, PH - 3.8);
    ft(doc, "normal", 7, C.white);
    doc.text(`${data.jobRefNumber}  ·  ${data.jobTitle}`, PW / 2, PH - 3.8, { align: "center" });
    doc.text(String(p), PW - MR, PH - 3.8, { align: "right" });
  };

  const gd = (y: number, need: number) => guard(doc, y, need, logo, footer);

  /* ════════════════════════
     HEADER  BAND
  ════════════════════════ */
  const HDR = 36;
  f(doc, C.orange); doc.rect(0, 0, PW, HDR, "F");
  f(doc, C.blue);   doc.rect(0, HDR, PW, 2.5, "F");

  // Logo
  if (logo) doc.addImage(logo, "JPEG", PW - MR - 23, 4.5, 23, 23, undefined, "FAST");

  // Two score badges left of logo
  const BW = 22, BH = 24, BGAP = 2.5;
  const b2x = PW - MR - 23 - BGAP - BW;
  const b1x = b2x - BGAP - BW;
  scoreBadge(doc, b1x, 5,   BW, BH, data.atsScore, "ATS SCORE",  C.orange);
  scoreBadge(doc, b2x, 5,   BW, BH, composite,     "COMPOSITE",  C.blue);

  // Candidate name / email / assessed line
  const nameMaxW = b1x - ML - 5;
  ft(doc, "bold", 13.5, C.white);
  const nLines = doc.splitTextToSize(data.candidateName || "Unknown Candidate", nameMaxW) as string[];
  doc.text(nLines[0], ML, 14);
  ft(doc, "normal", 8, [255, 218, 178] as C3);
  doc.text(data.candidateEmail || "", ML, 22.5);
  ft(doc, "normal", 7.5, [255, 196, 140] as C3);
  const jLine = [data.jobRefNumber, data.jobTitle, data.jobDepartment].filter(Boolean).join("  ·  ");
  doc.text(jLine.substring(0, 58), ML, 30.5);

  /* ════════════════════════
     META  ROW  (Uttarayan Scan label)
  ════════════════════════ */
  let y = HDR + 5.5;
  ft(doc, "bold", 7.5, C.orange);
  doc.text("UTTARAYAN SCAN", ML, y);
  ft(doc, "bold", 7, C.muted);
  doc.text("CANDIDATE PROFILE REPORT", ML + doc.getTextWidth("UTTARAYAN SCAN") + 5, y);
  ft(doc, "normal", 7, C.muted);
  const genDate = new Date(data.reportGeneratedAt)
    .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`Generated: ${genDate}`, PW - MR, y, { align: "right" });
  y += 5;

  /* ════════════════════════
     CONTACT  +  ASSESSED  SIDE-BY-SIDE  CARDS
  ════════════════════════ */
  {
    const GAP = 3, CW2 = (CW - GAP) / 2;
    const cardH = CARD_TH + CARD_PAD + 5.5 * 2 + CARD_PAD;

    // Contact card
    let by = cardHead(doc, "CONTACT DETAILS", C.orange, ML, y, CW2, cardH);
    const contactRows = [
      { k: "Phone",   v: data.candidatePhone   || "Not specified" },
      { k: "Email",   v: data.candidateEmail   || "Not specified" },
    ];
    for (const { k, v } of contactRows) {
      ft(doc, "bold", 7, C.muted); const kw = doc.getTextWidth(`${k}: `);
      doc.text(`${k}: `, ML + CARD_PAD, by);
      ft(doc, "normal", 7.5, C.navy);
      const vLine = (doc.splitTextToSize(v, CW2 - CARD_PAD * 2 - kw) as string[])[0];
      doc.text(vLine, ML + CARD_PAD + kw, by);
      by += 5.5;
    }
    // Address as last row, full width inside card
    ft(doc, "bold", 7, C.muted); doc.text("Address: ", ML + CARD_PAD, by);
    ft(doc, "normal", 7.5, C.navy);
    const addrLines = doc.splitTextToSize(data.candidateAddress || "Not specified",
      CW2 - CARD_PAD * 2 - doc.getTextWidth("Address: ")) as string[];
    doc.text(addrLines[0], ML + CARD_PAD + doc.getTextWidth("Address: "), by);

    // Assessed For card
    const ax = ML + CW2 + GAP;
    let aby = cardHead(doc, "ASSESSED FOR", C.blue, ax, y, CW2, cardH);
    const assessedRows = [
      { k: "Reference", v: data.jobRefNumber },
      { k: "Job Title",  v: data.jobTitle },
    ];
    for (const { k, v } of assessedRows) {
      ft(doc, "bold", 7, C.muted); const kw = doc.getTextWidth(`${k}: `);
      doc.text(`${k}: `, ax + CARD_PAD, aby);
      ft(doc, "normal", 7.5, C.navy);
      const vLine = (doc.splitTextToSize(v, CW2 - CARD_PAD * 2 - kw) as string[])[0];
      doc.text(vLine, ax + CARD_PAD + kw, aby);
      aby += 5.5;
    }
    if (data.jobDepartment) {
      ft(doc, "bold", 7, C.muted); doc.text("Department: ", ax + CARD_PAD, aby);
      ft(doc, "normal", 7.5, C.navy);
      doc.text(data.jobDepartment, ax + CARD_PAD + doc.getTextWidth("Department: "), aby);
    }

    y += cardH + 3;
  }

  /* ════════════════════════
     THREE  SCORE  CARDS
  ════════════════════════ */
  {
    const GAP = 3, SW = (CW - GAP * 2) / 3, BH = 22;
    const scores = [
      { label: "ATS SCORE",         val: data.atsScore,         col: C.orange },
      { label: "SUITABILITY SCORE", val: data.suitabilityScore, col: C.blue   },
      { label: "COMPOSITE SCORE",   val: composite,             col: composite >= 70 ? C.green : composite >= 45 ? C.orange : C.red },
    ];
    for (let i = 0; i < 3; i++) {
      const { label, val, col } = scores[i];
      const bx = ML + i * (SW + GAP);
      drawCard(doc, bx, y, SW, BH);
      f(doc, col); doc.rect(bx, y, SW, 3, "F"); // top colour band
      ft(doc, "bold", 16, col);
      doc.text(String(Math.round(val)), bx + SW / 2, y + 14, { align: "center" });
      ft(doc, "bold", 6, C.muted);
      doc.text(label, bx + SW / 2, y + 19.5, { align: "center" });
    }
    y += BH + 4;
  }

  /* ════════════════════════
     SUITABILITY  +  EXPERIENCE  HIGHLIGHTS
  ════════════════════════ */
  {
    const GAP = 3, HW = (CW - GAP) / 2, BH = 16;
    const suitLabel =
      data.suitabilityScore >= 75 ? "Highly Suitable" :
      data.suitabilityScore >= 55 ? "Suitable" :
      data.suitabilityScore >= 35 ? "Partially Suitable" : "Not Suitable";
    const expYrs = data.experienceYears != null ? `${data.experienceYears.toFixed(1)} yrs` : "N/A";

    f(doc, C.orange); doc.rect(ML, y, HW, BH, "F");
    ft(doc, "bold", 6.5, C.white); doc.text("SUITABILITY RATING", ML + HW / 2, y + 5.5, { align: "center" });
    ft(doc, "bold", 11, C.white);  doc.text(suitLabel, ML + HW / 2, y + 12.5, { align: "center" });

    f(doc, C.blue); doc.rect(ML + HW + GAP, y, HW, BH, "F");
    ft(doc, "bold", 6.5, C.white); doc.text("EXPERIENCE", ML + HW + GAP + HW / 2, y + 5.5, { align: "center" });
    ft(doc, "bold", 11, C.white);  doc.text(expYrs, ML + HW + GAP + HW / 2, y + 12.5, { align: "center" });
    y += BH + 4;
  }

  /* ════════════════════════
     PROFILE  SUMMARY  CARD  (adaptive height)
  ════════════════════════ */
  {
    const innerW = CW - CARD_PAD * 2;
    const bodyH  = measureBody(doc, data.aiSummary, innerW);
    const cardH  = CARD_TH + CARD_PAD + bodyH + CARD_PAD;
    y = gd(y, cardH + 4);
    const bodyY = cardHead(doc, "CANDIDATE PROFILE SUMMARY", C.orange, ML, y, CW, cardH);
    bodyText(doc, data.aiSummary, ML + CARD_PAD, bodyY, innerW);
    y += cardH + 4;
  }

  /* ════════════════════════
     EDUCATIONAL  QUALIFICATIONS  CARD  (adaptive)
  ════════════════════════ */
  const edus = (data.education || []).filter(e => e.degree || e.institution);
  if (edus.length > 0) {
    const lineH = 5.5;
    const bodyH = edus.length * lineH + CARD_PAD;
    const cardH = CARD_TH + CARD_PAD + bodyH;
    y = gd(y, cardH + 4);
    let by = cardHead(doc, "EDUCATIONAL QUALIFICATIONS", C.blue, ML, y, CW, cardH);
    for (const e of edus) {
      const line = [e.degree, e.institution, e.year].filter(Boolean).join("   ·   ");
      ft(doc, "bold", 7.5, C.blue); doc.text("•", ML + CARD_PAD, by);
      ft(doc, "normal", 8, C.navy); doc.text(line, ML + CARD_PAD + 5, by);
      by += lineH;
    }
    y += cardH + 4;
  }

  /* ════════════════════════
     EXPERIENCE  ASSESSMENT  (flowing — can span pages)
     Combines experienceMatch + every job description
     into one rich narrative, then work history as bullets.
  ════════════════════════ */
  y = gd(y, 20);
  y = secBar(doc, "EXPERIENCE ASSESSMENT & SUITABILITY TO ROLE", C.blue, y);

  // Comprehensive narrative
  {
    const narrative = buildExpNarrative(data);
    const innerW = CW;
    const lines = doc.splitTextToSize(narrative, innerW) as string[];
    const LH = 5.2;
    for (let i = 0; i < lines.length; i++) {
      y = guard(doc, y, LH + 2, logo, footer);
      ft(doc, "normal", 8.5, C.navy);
      const isLast = i === lines.length - 1 || lines[i].trim() === "";
      doc.text(lines[i], ML, y + 8.5 * 0.352778 * 0.35,
        { align: isLast ? "left" : "justify", maxWidth: innerW });
      y += LH;
    }
    y += 4;
  }

  // Suitability to role — extract AI suitability paragraphs from aiSummary
  {
    const paras = (data.aiSummary || "")
      .split(/\n+/)
      .map(p => p.trim())
      .filter(Boolean);

    // Use all paragraphs beyond the first as suitability analysis (the first is usually intro)
    const suitParas = paras.length > 1 ? paras.slice(1) : paras;
    const suitText  = suitParas.join("\n\n");
    const scoreVal  = Math.round(data.suitabilityScore);
    const scoreCol: C3 = scoreVal >= 70 ? C.green : scoreVal >= 45 ? C.orange : C.red;

    y = guard(doc, y, 20, logo, footer);
    y = subBar(doc, "SUITABILITY TO ROLE", C.orange, y, `${scoreVal}/100`);

    if (suitText) {
      const innerW = CW;
      const lines = doc.splitTextToSize(suitText, innerW) as string[];
      const LH = 5.2;
      for (let i = 0; i < lines.length; i++) {
        y = guard(doc, y, LH + 2, logo, footer);
        ft(doc, "normal", 8.5, C.navy);
        const isLast = i === lines.length - 1 || lines[i].trim() === "";
        doc.text(lines[i], ML, y + 8.5 * 0.352778 * 0.35,
          { align: isLast ? "left" : "justify", maxWidth: innerW });
        y += LH;
      }
      y += 4;
    }

    // Verdict chip
    const verdictLabel =
      composite >= 70 ? "Strong fit for the role" :
      composite >= 45 ? "Partial fit for the role" : "Does not meet role requirements";
    y = guard(doc, y, 12, logo, footer);
    f(doc, scoreCol); s(doc, scoreCol); lw(doc, 0.3);
    doc.roundedRect(ML, y, CW, 10, 2, 2, "F");
    ft(doc, "bold", 8.5, C.white);
    doc.text(verdictLabel, PW / 2, vcb(y, 10, 8.5), { align: "center" });
    y += 14;
  }

  // Work history — bullet list (title · company · duration, no description)
  const exps = (data.experience || []).filter(e => e.title || e.company);
  if (exps.length > 0) {
    y = guard(doc, y, 20, logo, footer);
    y = subBar(doc, "WORK HISTORY", C.slate, y);
    const LH = 5.5;
    for (const exp of exps) {
      y = guard(doc, y, LH + 2, logo, footer);
      const parts = [exp.title, exp.company, exp.duration].filter(Boolean);
      const line  = parts.join("  ·  ");
      ft(doc, "bold", 7.5, C.blue);
      doc.text("•", ML + 2, y + LH * 0.7);
      ft(doc, "normal", 8, C.navy);
      doc.text(line, ML + 7, y + LH * 0.7);
      y += LH;
    }
    y += 5;
  }

  /* ════════════════════════
     MATCHING  SKILLS  CARD  (adaptive)
  ════════════════════════ */
  const ms = data.matchingSkills || [];
  if (ms.length > 0) {
    const pillH = measurePills(doc, ms, CW - CARD_PAD * 2);
    const cardH = CARD_TH + CARD_PAD + pillH + CARD_PAD;
    y = gd(y, cardH + 4);
    let by = cardHead(doc, `MATCHING SKILLS  (${ms.length})`, C.green, ML, y, CW, cardH);
    pillRow(doc, ms, ML + CARD_PAD, by, CW - CARD_PAD * 2, C.green, C.greenL);
    y += cardH + 4;
  }

  /* ════════════════════════
     SKILLS  GAP  CARD  (adaptive)
  ════════════════════════ */
  const sg = data.skillGaps || [];
  if (sg.length > 0) {
    const pillH = measurePills(doc, sg, CW - CARD_PAD * 2);
    const cardH = CARD_TH + CARD_PAD + pillH + CARD_PAD;
    y = gd(y, cardH + 4);
    let by = cardHead(doc, `SKILLS GAP  (${sg.length})`, C.red, ML, y, CW, cardH);
    pillRow(doc, sg, ML + CARD_PAD, by, CW - CARD_PAD * 2, C.red, C.redL);
    y += cardH + 4;
  }

  /* ════════════════════════
     RECOMMENDATION  CARD  (adaptive)
  ════════════════════════ */
  {
    const recVerdict =
      composite >= 70 ? "Proceed to Interview / Hire Shortlist" :
      composite >= 45 ? "Consider for Further Interview" :
      "Does Not Meet Requirements";

    const verdictColor: C3 = composite >= 70 ? C.green : composite >= 45 ? C.orange : C.red;
    const verdictBg: C3   = composite >= 70 ? C.greenL : composite >= 45 ? C.warmOff : C.redL;

    // Use last paragraph(s) of aiSummary for recommendation detail
    const aiParas = (data.aiSummary || "").split(/\n+/).map(p => p.trim()).filter(Boolean);
    const recText = aiParas.length > 0 ? aiParas[aiParas.length - 1] : "Refer to the screening analysis above.";

    const innerW  = CW - CARD_PAD * 2 - 30; // leave space for score pill
    const recH    = measureBody(doc, recText, innerW);
    const cardH   = CARD_TH + CARD_PAD + 8 + recH + CARD_PAD + 4;
    y = gd(y, cardH + 4);

    let by = cardHead(doc, "RECOMMENDATION", C.orange, ML, y, CW, cardH);

    // Verdict badge inside body
    const VBH = 10, VBW = CW - CARD_PAD * 2;
    f(doc, verdictBg); s(doc, verdictColor); lw(doc, 0.4);
    doc.roundedRect(ML + CARD_PAD, by, VBW, VBH, 2, 2, "FD");
    ft(doc, "bold", 10, verdictColor);
    doc.text(recVerdict, ML + CARD_PAD + VBW / 2, vcb(by, VBH, 10), { align: "center" });
    by += VBH + 4;

    // Recommendation text
    bodyText(doc, recText, ML + CARD_PAD, by, innerW);

    // Score pill (right side)
    const PX_OFF = CW - CARD_PAD - 26, PW_P = 24, PH_P = 24;
    f(doc, verdictColor);
    doc.roundedRect(ML + PX_OFF, by - 2, PW_P, PH_P, 3, 3, "F");
    ft(doc, "bold", 16, C.white);
    doc.text(String(Math.round(composite)), ML + PX_OFF + PW_P / 2,
      by - 2 + PH_P * 0.54, { align: "center" });
    ft(doc, "bold", 5.5, C.white);
    doc.text("COMPOSITE", ML + PX_OFF + PW_P / 2, by - 2 + PH_P - 3.5, { align: "center" });

    y += cardH + 4;
  }

  footer();
}

/* ═══════════════════════════════════════════════════════
   COVER  PAGE  (batch reports)
═══════════════════════════════════════════════════════ */
function renderCoverPage(doc: jsPDF, candidates: ReportData[],
                         jobTitle: string, jobRefNumber: string, logo: string | null) {
  f(doc, C.pageBg); doc.rect(0, 0, PW, PH, "F");

  const sorted = [...candidates].sort((a, b) =>
    ((b.atsScore + b.suitabilityScore) / 2) - ((a.atsScore + a.suitabilityScore) / 2));

  // Header
  const HDR = 52;
  f(doc, C.orange); doc.rect(0, 0, PW, HDR, "F");
  f(doc, C.blue);   doc.rect(0, HDR, PW, 3, "F");

  if (logo) doc.addImage(logo, "JPEG", ML, 10, 30, 30, undefined, "FAST");
  ft(doc, "bold", 6, [255, 196, 140] as C3); doc.text("UTTARAYAN SCAN", ML + 37, 14);
  ft(doc, "bold", 20, C.white);
  doc.text("Candidate Batch Report", ML + 37, 24);
  ft(doc, "bold", 10, [255, 218, 178] as C3);
  doc.text(`${jobRefNumber}  ·  ${jobTitle}`, ML + 37, 34);
  const gd2 = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  ft(doc, "normal", 8.5, [255, 237, 213] as C3);
  doc.text(`Generated: ${gd2}   ·   Total Candidates: ${candidates.length}`, ML + 37, 44);

  let cy = HDR + 10;

  // Summary heading
  ft(doc, "bold", 9, C.orange);
  doc.text("CANDIDATE RANKING SUMMARY", ML, cy); cy += 7;

  // Table headers
  type Col = { x: number; w: number; label: string; align: "left" | "right" | "center" };
  const cols: Col[] = [
    { x:  0, w:  7, label: "#",       align: "center" },
    { x:  9, w: 55, label: "Name",    align: "left"   },
    { x: 66, w: 54, label: "Email",   align: "left"   },
    { x:122, w: 16, label: "ATS",     align: "center" },
    { x:140, w: 16, label: "Suit.",   align: "center" },
    { x:158, w: 16, label: "Score",   align: "center" },
    { x:176, w: 24, label: "Verdict", align: "left"   },
  ];
  const RH = 7.5;

  f(doc, C.blue); doc.rect(ML, cy, CW, RH, "F");
  ft(doc, "bold", 7, C.white);
  for (const { x, w, label, align } of cols) {
    const bx = ML + x;
    const tx = align === "right" ? bx + w : align === "center" ? bx + w / 2 : bx + 1.5;
    doc.text(label, tx, vcb(cy, RH, 7), { align });
  }
  cy += RH;

  for (let idx = 0; idx < sorted.length; idx++) {
    const c    = sorted[idx];
    const comp = (c.atsScore + c.suitabilityScore) / 2;
    const bg: C3 = idx % 2 === 0 ? [252, 249, 245] as C3 : C.white;
    f(doc, bg); doc.rect(ML, cy, CW, RH, "F");

    const rows: Array<{ col: Col; text: string; color: C3; bold?: boolean }> = [
      { col: cols[0], text: String(idx + 1),                              color: C.slate    },
      { col: cols[1], text: (c.candidateName || "Unknown").substring(0,26), color: C.navy   },
      { col: cols[2], text: (c.candidateEmail || "").substring(0, 28),    color: C.slate    },
      { col: cols[3], text: String(Math.round(c.atsScore)),               color: C.orange, bold: true },
      { col: cols[4], text: String(Math.round(c.suitabilityScore)),       color: C.blue,   bold: true },
      { col: cols[5], text: String(Math.round(comp)),                     color: C.navy,   bold: true },
      {
        col: cols[6],
        text: comp >= 70 ? "Proceed" : comp >= 45 ? "Consider" : "Not Suitable",
        color: comp >= 70 ? C.green : comp >= 45 ? C.orange : C.red,
        bold: true,
      },
    ];

    for (const { col, text, color, bold } of rows) {
      ft(doc, bold ? "bold" : "normal", 7.5, color);
      const bx = ML + col.x;
      const tx = col.align === "center" ? bx + col.w / 2
               : col.align === "right"  ? bx + col.w
               : bx + 1.5;
      doc.text(text, tx, vcb(cy, RH, 7.5), { align: col.align });
    }
    cy += RH;
  }

  // Cover footer
  f(doc, C.blue); doc.rect(0, PH - FTR, PW, FTR, "F");
  ft(doc, "bold", 7.5, C.white); doc.text("Screened through Uttarayan", ML, PH - 3.8);
  ft(doc, "normal", 7, C.white);
  doc.text(`${jobRefNumber}  ·  ${jobTitle}`, PW / 2, PH - 3.8, { align: "center" });
  doc.text("1", PW - MR, PH - 3.8, { align: "right" });
}

/* ═══════════════════════════════════════════════════════
   PUBLIC  API
═══════════════════════════════════════════════════════ */
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
    ((b.atsScore + b.suitabilityScore) / 2) - ((a.atsScore + a.suitabilityScore) / 2));

  renderCoverPage(doc, sorted, jobTitle, jobRefNumber, logo);

  for (const candidate of sorted) {
    doc.addPage();
    f(doc, C.pageBg); doc.rect(0, 0, PW, PH, "F");
    renderCandidate(doc, candidate, logo);
  }

  doc.save(`${jobRefNumber}_all_candidates_report.pdf`);
}
