import jsPDF from "jspdf";

/* ═══════════════════════════════════════════════
   COLOURS  (no pure black)
═══════════════════════════════════════════════ */
type C3 = [number, number, number];
const C = {
  orange:  [224, 120,  32] as C3,
  orangeL: [255, 240, 218] as C3,
  blue:    [ 55,  96, 210] as C3,
  blueL:   [236, 243, 255] as C3,
  navy:    [ 28,  40,  68] as C3,
  slate:   [ 75,  88, 115] as C3,
  muted:   [125, 136, 158] as C3,
  rule:    [213, 218, 230] as C3,
  pageBg:  [247, 248, 251] as C3,
  white:   [255, 255, 255] as C3,
  green:   [ 18, 140,  60] as C3,
  greenL:  [220, 252, 232] as C3,
  red:     [175,  28,  28] as C3,
  redL:    [254, 228, 228] as C3,
  amber:   [255, 248, 230] as C3,
};

/* ═══════════════════════════════════════════════
   GEOMETRY
═══════════════════════════════════════════════ */
const PW   = 210;
const PH   = 297;
const ML   = 12;
const MR   = 12;
const CW   = PW - ML - MR;        // 186 mm
const FTR  = 11;
const SAFE = PH - FTR - 4;
const CR   = 2.5;                  // card corner radius
const BAR  = 3.5;                  // left accent bar width
const TH   = 8.5;                  // card title strip height
const PAD  = 4.0;                  // inner card padding
const BX   = ML + BAR + CR + 2;   // body-text left edge inside a full-width card
const BW   = CW - BAR - CR - 2 - PAD; // body-text width inside a full-width card

/* ═══════════════════════════════════════════════
   PRIMITIVE  SETTERS
═══════════════════════════════════════════════ */
const f  = (d: jsPDF, c: C3) => d.setFillColor(...c);
const s  = (d: jsPDF, c: C3) => d.setDrawColor(...c);
const lw = (d: jsPDF, w: number) => d.setLineWidth(w);

function ft(d: jsPDF, wt: "normal" | "bold", sz: number, col: C3) {
  d.setFont("helvetica", wt);
  d.setFontSize(sz);
  d.setTextColor(...col);
}

const vcb = (by: number, bh: number, fs: number) =>
  by + bh / 2 + fs * 0.352778 * 0.37;

/* ═══════════════════════════════════════════════
   CARD  HELPERS
   drawCard  – white fill + rounded border (no accent bar)
   cardOpen  – white card + left accent bar + title + separator
               returns Y of first body line
   cardOpenAt – same as cardOpen but with custom body-x/width
═══════════════════════════════════════════════ */
function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number) {
  f(doc, C.white);
  doc.roundedRect(x, y, w, h, CR, CR, "F");
  s(doc, C.rule); lw(doc, 0.28);
  doc.roundedRect(x, y, w, h, CR, CR, "S");
}

function cardOpen(
  doc: jsPDF, title: string, accent: C3,
  x: number, y: number, w: number, h: number
): number {
  // 1. White fill
  f(doc, C.white);
  doc.roundedRect(x, y, w, h, CR, CR, "F");
  // 2. Left accent bar (rounded left, squared right)
  f(doc, accent);
  doc.roundedRect(x, y, BAR + CR, h, CR, CR, "F");
  doc.rect(x + CR, y, BAR - CR + 0.4, h, "F");
  // 3. Border drawn last so it's always visible
  s(doc, C.rule); lw(doc, 0.28);
  doc.roundedRect(x, y, w, h, CR, CR, "S");
  // 4. Separator line
  lw(doc, 0.2);
  doc.line(x + BAR + 0.5, y + TH, x + w - 0.5, y + TH);
  // 5. Title
  ft(doc, "bold", 8, accent);
  doc.text(title, x + BAR + CR + 2.5, vcb(y, TH, 8));
  return y + TH + PAD;
}

/* ═══════════════════════════════════════════════
   MEASURE  helpers
═══════════════════════════════════════════════ */
function measureLines(doc: jsPDF, text: string, maxW: number,
                      fs: number, lh: number): number {
  doc.setFontSize(fs);
  const lines = doc.splitTextToSize(text || ".", maxW) as string[];
  return lines.length * lh;
}

function measurePills(doc: jsPDF, items: string[], maxW: number): number {
  const PH_P = 6, PX = 3.5, GX = 2.5, GY = 2.5;
  doc.setFontSize(7.5);
  let x = 0, y = 0;
  for (const sk of items) {
    const pw = doc.getTextWidth(sk) + PX * 2;
    if (x + pw > maxW + 0.5) { x = 0; y += PH_P + GY; }
    x += pw + GX;
  }
  return y + PH_P;
}

/* ═══════════════════════════════════════════════
   RENDER  helpers
═══════════════════════════════════════════════ */
function textBlock(
  doc: jsPDF, text: string,
  x: number, y: number, maxW: number,
  fs = 8.5, lh = 5.0
): number {
  ft(doc, "normal", fs, C.navy);
  const lines = doc.splitTextToSize(text || "", maxW) as string[];
  lines.forEach((line, i) => {
    const isLast = i === lines.length - 1 || line.trim() === "";
    doc.text(line, x, y + i * lh + fs * 0.352778 * 0.35,
      { align: isLast ? "left" : "justify", maxWidth: maxW });
  });
  return y + lines.length * lh;
}

function pillsRow(
  doc: jsPDF, items: string[],
  x0: number, y0: number, maxW: number,
  fg: C3, bg: C3
): number {
  const PH_P = 6, PX = 3.5, GX = 2.5, GY = 2.5, FS = 7.5;
  ft(doc, "normal", FS, fg); s(doc, fg); lw(doc, 0.28);
  let x = x0, y = y0;
  for (const sk of items) {
    const pw = doc.getTextWidth(sk) + PX * 2;
    if (x + pw > x0 + maxW + 0.5) { x = x0; y += PH_P + GY; }
    f(doc, bg);
    doc.roundedRect(x, y, pw, PH_P, 1.4, 1.4, "FD");
    doc.setTextColor(...fg);
    doc.text(sk, x + PX, vcb(y, PH_P, FS));
    x += pw + GX;
  }
  return y + PH_P;
}

/* ═══════════════════════════════════════════════
   PAGE-BREAK  GUARD
═══════════════════════════════════════════════ */
function guard(
  doc: jsPDF, y: number, need: number,
  logo: string | null, footerFn: () => void
): number {
  if (y + need <= SAFE) return y;
  footerFn();
  doc.addPage();
  f(doc, C.pageBg); doc.rect(0, 0, PW, PH, "F");
  f(doc, C.orange); doc.rect(0, 0, PW, 2.2, "F");
  if (logo) doc.addImage(logo, "JPEG", PW - MR - 14, 4, 12, 12, undefined, "FAST");
  return 20;
}

/* ═══════════════════════════════════════════════
   SCORE  BADGE  (header)
═══════════════════════════════════════════════ */
function scoreBadge(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  score: number, label: string, numCol: C3
) {
  f(doc, C.white); s(doc, C.rule); lw(doc, 0.3);
  doc.roundedRect(x, y, w, h, CR, CR, "FD");
  ft(doc, "bold", 15, numCol);
  doc.text(String(Math.round(score)), x + w / 2, y + h * 0.57, { align: "center" });
  ft(doc, "bold", 5.5, C.muted);
  doc.text(label, x + w / 2, y + h - 2.5, { align: "center" });
}

/* ═══════════════════════════════════════════════
   EXPORTED  TYPE
═══════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════
   EXPERIENCE  YEARS  CALCULATION
   Sums individual role durations parsed from the
   duration string (e.g. "1 Dec, 2024 – 4 Jul, 2025").
═══════════════════════════════════════════════ */
const MONTH_MAP: Record<string, number> = {
  jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
  jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
  january:1, february:2, march:3, april:4, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
};

function parseMonthYear(s: string): { year: number; month: number } | null {
  if (!s) return null;
  const t = s.trim();
  if (/\b(present|current|now|ongoing|till\s*date|to\s*date)\b/i.test(t)) {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() + 1 };
  }
  const ym = t.match(/\b(19|20)\d{2}\b/);
  if (!ym) return null;
  const year = parseInt(ym[0]);
  const lower = t.toLowerCase();
  let month = 6;
  for (const [name, num] of Object.entries(MONTH_MAP)) {
    if (lower.includes(name)) { month = num; break; }
  }
  return { year, month };
}

function durationMonths(dur: string): number {
  if (!dur) return 0;
  // Split on en/em dash or " - " with optional spaces
  const parts = dur.split(/\s*[–—]\s*|\s+-\s+/).map(p => p.trim());
  if (parts.length < 2) return 0;
  const start = parseMonthYear(parts[0]);
  const end   = parseMonthYear(parts[1]);
  if (!start || !end) return 0;
  return Math.max(0, (end.year - start.year) * 12 + (end.month - start.month));
}

function totalExpYears(data: ReportData): string {
  if (data.experienceYears != null && data.experienceYears > 0)
    return `${Math.round(data.experienceYears)} yrs`;
  let total = 0;
  for (const e of (data.experience || [])) total += durationMonths(e.duration || "");
  if (total > 0) return `${Math.round(total / 12)} yrs`;
  const roles = (data.experience || []).filter(e => e.title || e.company).length;
  return roles > 0 ? `${roles} roles` : "N/A";
}

/* ═══════════════════════════════════════════════
   BUILD  EXPERIENCE  NARRATIVE  PARAGRAPH 2
   Derives a 1-sentence role-progression paragraph
   from role titles and descriptions WITHOUT company names.
═══════════════════════════════════════════════ */
function buildExpProgression(data: ReportData): string {
  const exps = (data.experience || []).filter(e => e.title);
  if (exps.length === 0) return "";

  const titles = exps.map(e => e.title!).filter(Boolean);

  // Pull first meaningful sentence from each description, skipping bare company labels
  const descSentences = exps
    .filter(e => e.description && e.description.length > 40
              && !/^(process\s*–|client\s*–|captive unit)/i.test(e.description))
    .map(e => {
      const first = e.description!.split(/[.!?]/)[0].trim();
      return first.length > 20 ? first : null;
    })
    .filter(Boolean)
    .slice(0, 2) as string[];

  const rolesStr = titles.length > 1
    ? `${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`
    : titles[0] || "";

  const progressPart = `The candidate's career trajectory spans roles including ${rolesStr}, reflecting progressive responsibility across finance functions.`;

  const detailPart = descSentences.length > 0
    ? ` Key contributions include: ${descSentences.join("; ")}.`
    : "";

  return progressPart + detailPart;
}

/* ─── Suitability helpers ─── */
function suitLabel(score: number): string {
  return score >= 75 ? "Highly Suitable"
       : score >= 55 ? "Suitable"
       : score >= 35 ? "Partially Suitable"
       : "Not Suitable";
}
function scoreColor(score: number): C3 {
  return score >= 70 ? C.green : score >= 45 ? C.orange : C.red;
}
function scoreBg(score: number): C3 {
  return score >= 70 ? C.greenL : score >= 45 ? C.amber : C.redL;
}

/* ═══════════════════════════════════════════════
   CORE  RENDERER
═══════════════════════════════════════════════ */
function renderCandidate(doc: jsPDF, data: ReportData, logo: string | null): void {
  const composite = (data.atsScore + data.suitabilityScore) / 2;

  f(doc, C.pageBg); doc.rect(0, 0, PW, PH, "F");

  const footer = () => {
    const p = (doc as any).internal.getNumberOfPages();
    f(doc, C.blue); doc.rect(0, PH - FTR, PW, FTR, "F");
    ft(doc, "bold", 7, C.white);
    doc.text("Screened through Uttarayan", ML, PH - 3.5);
    ft(doc, "normal", 6.5, C.white);
    doc.text(`${data.jobRefNumber}  ·  ${data.jobTitle}`, PW / 2, PH - 3.5, { align: "center" });
    doc.text(String(p), PW - MR, PH - 3.5, { align: "right" });
  };
  const gd = (y: number, need: number) => guard(doc, y, need, logo, footer);

  /* ══════════════════════════════
     1.  HEADER  (orange band)
     "UTTARAYAN SCAN" is the centred report heading at the very top,
     white fill + kumkum-red outline, same size as candidate name.
  ══════════════════════════════ */
  const HDR = 48;
  const KUMKUM: C3 = [176, 36, 36];

  f(doc, C.orange); doc.rect(0, 0, PW, HDR, "F");
  f(doc, C.blue);   doc.rect(0, HDR, PW, 2.2, "F");

  // ── "UTTARAYAN SCAN" centred heading ──────────────────────────────
  // Pass 1: thick kumkum-red stroke (creates the outline border)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  s(doc, KUMKUM); lw(doc, 1.0);
  doc.text("UTTARAYAN SCAN", PW / 2, 9.5,
    { align: "center", renderingMode: "stroke" });
  // Pass 2: white fill drawn on top (fills the letter interiors)
  doc.setTextColor(255, 255, 255);
  lw(doc, 0);
  doc.text("UTTARAYAN SCAN", PW / 2, 9.5, { align: "center" });

  // thin separator below heading
  s(doc, [255, 175, 110] as C3); lw(doc, 0.25);
  doc.line(ML, 13, PW - MR, 13);

  // ── Score badges + logo (shifted below heading) ───────────────────
  if (logo) doc.addImage(logo, "JPEG", PW - MR - 22, 15.5, 22, 22, undefined, "FAST");
  const BW2 = 21, BH2 = 22, BGAP = 2;
  const b2x = PW - MR - 22 - BGAP - BW2;
  const b1x = b2x - BGAP - BW2;
  scoreBadge(doc, b1x, 15.5, BW2, BH2, data.atsScore, "ATS SCORE", C.orange);
  scoreBadge(doc, b2x, 15.5, BW2, BH2, composite,     "COMPOSITE", C.blue);

  // ── Candidate name / email / ref ──────────────────────────────────
  const nameMaxW = b1x - ML - 5;
  ft(doc, "bold", 13, C.white);
  const nLines = doc.splitTextToSize(data.candidateName || "Unknown", nameMaxW) as string[];
  doc.text(nLines[0], ML, 22.5);

  ft(doc, "normal", 7.5, [255, 218, 175] as C3);
  doc.text(data.candidateEmail || "", ML, 30.5);

  ft(doc, "normal", 7, [255, 196, 140] as C3);
  const jLine = [data.jobRefNumber, data.jobTitle, data.jobDepartment].filter(Boolean).join("  ·  ");
  doc.text(jLine.substring(0, 60), ML, 39.5);

  /* ══════════════════════════════
     2.  META ROW
  ══════════════════════════════ */
  let y = HDR + 5;
  ft(doc, "normal", 6.5, C.muted);
  const genDate = new Date(data.reportGeneratedAt)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  doc.text(`Candidate Profile Report  ·  Generated: ${genDate}`, ML, y);
  y += 5.5;

  /* ══════════════════════════════
     3.  CONTACT  +  ASSESSED  CARDS  (side by side)
  ══════════════════════════════ */
  {
    const GAP = 3, CW2 = (CW - GAP) / 2;
    const ROW_H = 4.8, ROWS = 3;
    const cardH = TH + PAD + ROWS * ROW_H + PAD;

    // Contact card
    let cy = cardOpen(doc, "CONTACT DETAILS", C.orange, ML, y, CW2, cardH);
    for (const { k, v } of [
      { k: "Phone",   v: data.candidatePhone   || "Not specified" },
      { k: "Email",   v: data.candidateEmail   || "Not specified" },
      { k: "Address", v: data.candidateAddress || "Not specified" },
    ]) {
      ft(doc, "bold", 6.5, C.muted);
      const kw = doc.getTextWidth(`${k}: `);
      doc.text(`${k}: `, BX, cy);
      ft(doc, "normal", 7, C.navy);
      const vl = (doc.splitTextToSize(v, CW2 - (BX - ML) - PAD - kw) as string[])[0];
      doc.text(vl, BX + kw, cy);
      cy += ROW_H;
    }

    // Assessed For card
    const ax  = ML + CW2 + GAP;
    const abx = ax + BAR + CR + 2.5;
    const abw = CW2 - BAR - CR - 2.5 - PAD;
    let aby = cardOpen(doc, "ASSESSED FOR", C.blue, ax, y, CW2, cardH);
    for (const { k, v } of [
      { k: "Reference",  v: data.jobRefNumber },
      { k: "Job Title",  v: data.jobTitle },
      { k: "Department", v: data.jobDepartment || "General" },
    ]) {
      ft(doc, "bold", 6.5, C.muted);
      const kw = doc.getTextWidth(`${k}: `);
      doc.text(`${k}: `, abx, aby);
      ft(doc, "normal", 7, C.navy);
      const vl = (doc.splitTextToSize(v, abw - kw) as string[])[0];
      doc.text(vl, abx + kw, aby);
      aby += ROW_H;
    }

    y += cardH + 3.5;
  }

  /* ══════════════════════════════
     4.  THREE  SCORE  TILES
  ══════════════════════════════ */
  {
    const GAP = 3, SW = (CW - GAP * 2) / 3, SH = 20;
    [
      { label: "ATS SCORE",         val: data.atsScore,         col: C.orange },
      { label: "SUITABILITY SCORE", val: data.suitabilityScore, col: C.blue   },
      { label: "COMPOSITE SCORE",   val: composite,             col: scoreColor(composite) },
    ].forEach(({ label, val, col }, i) => {
      const bx = ML + i * (SW + GAP);
      f(doc, C.white); s(doc, C.rule); lw(doc, 0.28);
      doc.roundedRect(bx, y, SW, SH, CR, CR, "FD");
      // Coloured top band
      f(doc, col);
      doc.roundedRect(bx, y, SW, CR * 2 + 3, CR, CR, "F");
      doc.rect(bx, y + CR, SW, CR + 3, "F");
      ft(doc, "bold", 16, col);
      doc.text(String(Math.round(val)), bx + SW / 2, y + 13.5, { align: "center" });
      ft(doc, "bold", 5.8, C.muted);
      doc.text(label, bx + SW / 2, y + 18.5, { align: "center" });
    });
    y += SH + 3.5;
  }

  /* ══════════════════════════════
     5.  SUITABILITY + TOTAL EXPERIENCE STRIP
  ══════════════════════════════ */
  {
    const GAP = 3, HW = (CW - GAP) / 2, SH = 15;
    const expStr = totalExpYears(data);

    f(doc, C.orange);
    doc.roundedRect(ML, y, HW, SH, CR, CR, "F");
    ft(doc, "bold", 6, C.white); doc.text("SUITABILITY RATING", ML + HW / 2, y + 5.5, { align: "center" });
    ft(doc, "bold", 10, C.white); doc.text(suitLabel(data.suitabilityScore), ML + HW / 2, y + 12, { align: "center" });

    f(doc, C.blue);
    doc.roundedRect(ML + HW + GAP, y, HW, SH, CR, CR, "F");
    ft(doc, "bold", 6, C.white); doc.text("TOTAL EXPERIENCE", ML + HW + GAP + HW / 2, y + 5.5, { align: "center" });
    ft(doc, "bold", 10, C.white); doc.text(expStr, ML + HW + GAP + HW / 2, y + 12, { align: "center" });

    y += SH + 4;
  }

  /* ══════════════════════════════
     6.  RECOMMENDATION  CARD  ← moved before profile
  ══════════════════════════════ */
  {
    const verdict =
      composite >= 70 ? "Proceed to Interview / Hire Shortlist" :
      composite >= 45 ? "Consider for Further Interview" :
      "Does Not Meet Role Requirements";
    const vCol = scoreColor(composite);
    const vBg  = scoreBg(composite);

    // Last 1–2 paragraphs of aiSummary as justification
    const paras = (data.aiSummary || "").split(/\n+/).map(p => p.trim()).filter(Boolean);
    const justParts = paras.length > 2 ? paras.slice(-2) : paras;
    const justText  = justParts.join(" ");

    const PILL_W = 26;
    const justMaxW = BW - PILL_W - 3;
    const justH = measureLines(doc, justText, justMaxW, 8.2, 5.0);
    const cardH = TH + PAD + 10 + 4 + justH + PAD + 4;

    y = gd(y, cardH + 4);
    const by = cardOpen(doc, "RECOMMENDATION", C.orange, ML, y, CW, cardH);

    // Verdict chip (full body width)
    f(doc, vBg); s(doc, vCol); lw(doc, 0.4);
    doc.roundedRect(BX, by, BW, 10, 2, 2, "FD");
    ft(doc, "bold", 10, vCol);
    doc.text(verdict, BX + (BW - PILL_W) / 2, vcb(by, 10, 10), { align: "center" });

    // Justification text + score pill
    const jy = by + 10 + 4;
    textBlock(doc, justText, BX, jy, justMaxW, 8.2, 5.0);

    const pillH = Math.min(Math.max(justH, 20), 28);
    f(doc, vCol);
    doc.roundedRect(BX + justMaxW + 3, jy, PILL_W, pillH, 3, 3, "F");
    ft(doc, "bold", 15, C.white);
    doc.text(String(Math.round(composite)), BX + justMaxW + 3 + PILL_W / 2,
      jy + pillH * 0.5, { align: "center" });
    ft(doc, "bold", 5.5, C.white);
    doc.text("COMPOSITE", BX + justMaxW + 3 + PILL_W / 2, jy + pillH - 4, { align: "center" });

    y += cardH + 4;
  }

  /* ══════════════════════════════
     7.  CANDIDATE  OVERVIEW  (first paragraph of aiSummary)
  ══════════════════════════════ */
  {
    const paras = (data.aiSummary || "").split(/\n+/).map(p => p.trim()).filter(Boolean);
    const snapshot = paras[0] || "";
    if (snapshot) {
      const bh = measureLines(doc, snapshot, BW, 8.5, 5.0);
      const cardH = TH + PAD + bh + PAD;
      y = gd(y, cardH + 4);
      const by = cardOpen(doc, "CANDIDATE OVERVIEW", C.blue, ML, y, CW, cardH);
      textBlock(doc, snapshot, BX, by, BW, 8.5, 5.0);
      y += cardH + 4;
    }
  }

  /* ══════════════════════════════
     8.  EXPERIENCE  ASSESSMENT  CARD
     Para 1 : experienceMatch (AI's assessment of experience vs role)
     Para 2 : role-progression narrative (no company names)
     + suitability verdict chip
  ══════════════════════════════ */
  {
    const assessment = (data.experienceMatch && data.experienceMatch.trim() !== "N/A")
      ? data.experienceMatch
      : "Experience analysis not available.";

    const progression = buildExpProgression(data);

    const fullText = progression
      ? `${assessment}\n\n${progression}`
      : assessment;

    const CHIP_H = 9;
    const assessH = measureLines(doc, fullText, BW, 8.5, 5.0);
    const cardH   = TH + PAD + assessH + 4 + CHIP_H + PAD;

    y = gd(y, Math.min(cardH, 90) + 4);
    const by0 = cardOpen(doc, "EXPERIENCE ASSESSMENT", C.blue, ML, y, CW, cardH);

    // Render two paragraphs
    const para1Lines = doc.splitTextToSize(assessment, BW) as string[];
    let cy = by0;
    para1Lines.forEach((line, i) => {
      const isLast = i === para1Lines.length - 1 || line.trim() === "";
      doc.text(line, BX, cy + i * 5.0 + 8.5 * 0.352778 * 0.35,
        { align: isLast ? "left" : "justify", maxWidth: BW });
    });
    cy += para1Lines.length * 5.0;

    if (progression) {
      cy += 4; // paragraph gap
      cy = guard(doc, cy, 20, logo, footer);
      ft(doc, "normal", 8.5, C.navy);
      const p2Lines = doc.splitTextToSize(progression, BW) as string[];
      p2Lines.forEach((line, i) => {
        const isLast = i === p2Lines.length - 1 || line.trim() === "";
        doc.text(line, BX, cy + i * 5.0 + 8.5 * 0.352778 * 0.35,
          { align: isLast ? "left" : "justify", maxWidth: BW });
      });
      cy += p2Lines.length * 5.0;
    }

    cy += 4;
    // Suitability chip
    cy = guard(doc, cy, CHIP_H + 2, logo, footer);
    const chipCol = scoreColor(data.suitabilityScore);
    const chipBg  = scoreBg(data.suitabilityScore);
    f(doc, chipBg); s(doc, chipCol); lw(doc, 0.4);
    doc.roundedRect(BX, cy, BW, CHIP_H, 2, 2, "FD");
    ft(doc, "bold", 8, chipCol);
    doc.text(
      `${suitLabel(data.suitabilityScore)}  ·  Suitability Score: ${Math.round(data.suitabilityScore)}/100`,
      BX + BW / 2, vcb(cy, CHIP_H, 8), { align: "center" }
    );

    y += cardH + 4;
  }

  /* ══════════════════════════════
     9.  WORK HISTORY  +  EDUCATION  SIDE-BY-SIDE
  ══════════════════════════════ */
  {
    const GAP = 3, HW = (CW - GAP) / 2;
    const hbx = ML + BAR + CR + 2.5;               // body x inside left card
    const hbw = HW - BAR - CR - 2.5 - PAD;         // body width inside half card
    const ebx = ML + HW + GAP + BAR + CR + 2.5;    // body x inside right card
    const ebw = hbw;

    const BULL_LH = 4.8;
    const SUB_LH  = 4.0;   // extra height for company / institution sub-line
    const expItems = (data.experience || []).filter(e => e.title || e.company);
    const edus     = (data.education  || []).filter(e => e.degree || e.institution);

    // Each entry = BULL_LH for the main line + SUB_LH if there is a company/institution sub-line
    const histH = expItems.reduce((acc, e) => acc + BULL_LH + (e.company     ? SUB_LH : 0), 0);
    const eduH  = edus.reduce    ((acc, e) => acc + BULL_LH + (e.institution ? SUB_LH : 0), 0);
    const rowH  = Math.max(histH, eduH, 12);
    const cardH = TH + PAD + rowH + PAD;

    if (expItems.length > 0 || edus.length > 0) {
      y = gd(y, cardH + 4);

      // Work History card (left)
      if (expItems.length > 0) {
        let cy = cardOpen(doc, "WORK HISTORY", C.slate, ML, y, HW, cardH);
        for (const exp of expItems) {
          cy = guard(doc, cy, BULL_LH + 1, logo, footer);
          ft(doc, "bold", 7.5, C.blue); doc.text("•", hbx, cy);
          const parts = [exp.title, exp.duration].filter(Boolean).join("  ·  ");
          ft(doc, "normal", 7.5, C.navy);
          const bline = (doc.splitTextToSize(parts, hbw - 4) as string[])[0];
          doc.text(bline, hbx + 4, cy);
          // Company on second line in muted colour
          if (exp.company) {
            ft(doc, "normal", 6.5, C.muted);
            const cline = (doc.splitTextToSize(exp.company, hbw - 4) as string[])[0];
            // Only add company line if there's enough space (fits in 1 extra line)
            doc.text(cline, hbx + 4, cy + 3.5);
            cy += 4.0;
          }
          cy += BULL_LH;
        }
      } else {
        drawCard(doc, ML, y, HW, cardH);
      }

      // Education card (right)
      if (edus.length > 0) {
        let cy = cardOpen(doc, "EDUCATIONAL QUALIFICATIONS", C.orange, ML + HW + GAP, y, HW, cardH);
        for (const e of edus) {
          cy = guard(doc, cy, BULL_LH + 1, logo, footer);
          ft(doc, "bold", 7.5, C.orange); doc.text("•", ebx, cy);
          const deg = [e.degree, e.year].filter(Boolean).join("  ·  ");
          ft(doc, "bold", 7.5, C.navy);
          const dline = (doc.splitTextToSize(deg, ebw - 4) as string[])[0];
          doc.text(dline, ebx + 4, cy);
          if (e.institution) {
            ft(doc, "normal", 6.5, C.muted);
            const iline = (doc.splitTextToSize(e.institution, ebw - 4) as string[])[0];
            doc.text(iline, ebx + 4, cy + 3.5);
            cy += 4.0;
          }
          cy += BULL_LH;
        }
      } else {
        drawCard(doc, ML + HW + GAP, y, HW, cardH);
      }

      y += cardH + 4;
    }
  }

  /* ══════════════════════════════
     10. MATCHING SKILLS  (full width, stacked)
  ══════════════════════════════ */
  const ms = data.matchingSkills || [];
  if (ms.length > 0) {
    const pillH = measurePills(doc, ms, BW);
    const cardH = TH + PAD + pillH + PAD;
    y = gd(y, cardH + 4);
    const by = cardOpen(doc, `MATCHING SKILLS  (${ms.length})`, C.green, ML, y, CW, cardH);
    pillsRow(doc, ms, BX, by, BW, C.green, C.greenL);
    y += cardH + 4;
  }

  /* ══════════════════════════════
     11. SKILLS GAP  (full width, stacked below matching)
  ══════════════════════════════ */
  const sg = data.skillGaps || [];
  if (sg.length > 0) {
    const pillH = measurePills(doc, sg, BW);
    const cardH = TH + PAD + pillH + PAD;
    y = gd(y, cardH + 4);
    const by = cardOpen(doc, `SKILLS GAP  (${sg.length})`, C.red, ML, y, CW, cardH);
    pillsRow(doc, sg, BX, by, BW, C.red, C.redL);
    y += cardH + 4;
  }

  footer();
}

/* ═══════════════════════════════════════════════
   COVER  PAGE  (batch)
═══════════════════════════════════════════════ */
function renderCoverPage(
  doc: jsPDF, candidates: ReportData[],
  jobTitle: string, jobRefNumber: string, logo: string | null
) {
  f(doc, C.pageBg); doc.rect(0, 0, PW, PH, "F");
  const sorted = [...candidates].sort((a, b) =>
    ((b.atsScore + b.suitabilityScore) / 2) - ((a.atsScore + a.suitabilityScore) / 2));

  const HDR = 48;
  f(doc, C.orange); doc.rect(0, 0, PW, HDR, "F");
  f(doc, C.blue);   doc.rect(0, HDR, PW, 2.5, "F");
  if (logo) doc.addImage(logo, "JPEG", ML, 10, 28, 28, undefined, "FAST");

  ft(doc, "bold", 6.5, [255, 196, 140] as C3); doc.text("UTTARAYAN SCAN", ML + 35, 14);
  ft(doc, "bold", 20, C.white); doc.text("Candidate Batch Report", ML + 35, 25);
  ft(doc, "bold", 10, [255, 218, 178] as C3);
  doc.text(`${jobRefNumber}  ·  ${jobTitle}`, ML + 35, 36);
  const gd2 = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  ft(doc, "normal", 8, [255, 237, 213] as C3);
  doc.text(`${gd2}   ·   ${candidates.length} candidates`, ML + 35, 44.5);

  let cy = HDR + 10;
  ft(doc, "bold", 9, C.orange); doc.text("CANDIDATE RANKING SUMMARY", ML, cy); cy += 7;

  type Coldef = { x: number; w: number; label: string; al: "left" | "right" | "center" };
  const cols: Coldef[] = [
    { x:  0, w:  7, label: "#",       al: "center" },
    { x:  9, w: 55, label: "Name",    al: "left"   },
    { x: 66, w: 52, label: "Email",   al: "left"   },
    { x:120, w: 15, label: "ATS",     al: "center" },
    { x:137, w: 15, label: "Suit.",   al: "center" },
    { x:154, w: 15, label: "Score",   al: "center" },
    { x:171, w: 29, label: "Verdict", al: "left"   },
  ];
  const RH = 7.5;

  f(doc, C.blue); doc.roundedRect(ML, cy, CW, RH, 1.5, 1.5, "F");
  ft(doc, "bold", 7, C.white);
  for (const { x, w, label, al } of cols) {
    const bx = ML + x;
    const tx = al === "center" ? bx + w / 2 : al === "right" ? bx + w : bx + 1.5;
    doc.text(label, tx, vcb(cy, RH, 7), { align: al });
  }
  cy += RH;

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    const comp = (c.atsScore + c.suitabilityScore) / 2;
    const bg: C3 = i % 2 === 0 ? [252, 249, 245] as C3 : C.white;
    f(doc, bg); doc.rect(ML, cy, CW, RH, "F");

    const rows: Array<{ col: Coldef; text: string; color: C3; bold?: boolean }> = [
      { col: cols[0], text: String(i + 1),                                   color: C.muted              },
      { col: cols[1], text: (c.candidateName || "Unknown").substring(0, 26), color: C.navy               },
      { col: cols[2], text: (c.candidateEmail || "").substring(0, 26),       color: C.slate              },
      { col: cols[3], text: String(Math.round(c.atsScore)),                  color: C.orange, bold: true },
      { col: cols[4], text: String(Math.round(c.suitabilityScore)),          color: C.blue,   bold: true },
      { col: cols[5], text: String(Math.round(comp)),                        color: C.navy,   bold: true },
      { col: cols[6],
        text: comp >= 70 ? "Proceed" : comp >= 45 ? "Consider" : "Not Suitable",
        color: scoreColor(comp), bold: true },
    ];
    for (const { col, text, color, bold } of rows) {
      ft(doc, bold ? "bold" : "normal", 7.5, color);
      const bx = ML + col.x;
      const tx = col.al === "center" ? bx + col.w / 2 : col.al === "right" ? bx + col.w : bx + 1.5;
      doc.text(text, tx, vcb(cy, RH, 7.5), { align: col.al });
    }
    cy += RH;
  }

  f(doc, C.blue); doc.rect(0, PH - FTR, PW, FTR, "F");
  ft(doc, "bold", 7, C.white); doc.text("Screened through Uttarayan", ML, PH - 3.5);
  ft(doc, "normal", 6.5, C.white);
  doc.text(`${jobRefNumber}  ·  ${jobTitle}`, PW / 2, PH - 3.5, { align: "center" });
  doc.text("1", PW - MR, PH - 3.5, { align: "right" });
}

/* ═══════════════════════════════════════════════
   PUBLIC  API
═══════════════════════════════════════════════ */
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
