import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import OpenAI from "openai";

const docIntelligenceEndpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT!;
const docIntelligenceKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY!;
const openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT!;
const openaiKey = process.env.AZURE_OPENAI_API_KEY!;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME!;

export function getDocumentClient() {
  return new DocumentAnalysisClient(
    docIntelligenceEndpoint,
    new AzureKeyCredential(docIntelligenceKey)
  );
}

export function getOpenAIClient() {
  return new OpenAI({
    apiKey: openaiKey,
    baseURL: `${openaiEndpoint.replace(/\/$/, "")}/openai/deployments/${deploymentName}`,
    defaultQuery: { "api-version": "2024-02-01" },
    defaultHeaders: { "api-key": openaiKey },
  });
}

export { deploymentName };

/** Minimum characters of extracted text to attempt AI evaluation */
export const MIN_READABLE_TEXT_LENGTH = 150;

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    const client = getDocumentClient();
    const poller = await client.beginAnalyzeDocument("prebuilt-read", buffer, {
      contentType: mimeType as "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "text/plain",
    });
    const result = await poller.pollUntilDone();
    const text = result.content ?? "";
    return text;
  } catch (err) {
    console.error("Document Intelligence error:", err);
    throw new Error(`Failed to extract text: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function safeParseJSON(raw: string): Record<string, unknown> | null {
  // Strip markdown code fences
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Find first { ... } block
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export interface ParsedJobDescription {
  title: string;
  department: string;
  jobRefNumber: string;
  description: string;
  requiredSkills: string[];
  experienceRequired: string;
  educationRequired: string;
}

function cleanJDText(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\u2012\u2013\u2014\u2015\u2053\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Extract a labeled field value, e.g. "Experience required: 5 years" → "5 years" */
function extractLabeled(text: string, ...labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(
      label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[:\\-]?\\s*(.+?)(?=\\n|$)",
      "i"
    );
    const m = text.match(re);
    if (m && m[1].trim().length > 2) return m[1].trim();
  }
  return "";
}

/** Extract the job title from common patterns */
function extractTitle(text: string): string {
  // Pattern: "JOB DESCRIPTION: TITLE" or "Job Title: TITLE"
  const patterns = [
    /job\s+(?:description|title|role|position)\s*[:\-]\s*(.+?)(?:\n|$)/i,
    /position\s*[:\-]\s*(.+?)(?:\n|$)/i,
    /role\s*[:\-]\s*(.+?)(?:\n|$)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1].trim().length > 2) return toTitleCase(m[1].trim());
  }
  // First non-empty line that looks like a title (short, no lowercase sentence words)
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (line.length > 4 && line.length < 120 && !/^\d/.test(line)) {
      return toTitleCase(line.replace(/^job description[:\s]*/i, "").trim());
    }
  }
  return "";
}

function toTitleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Extract department from common patterns */
function extractDepartment(text: string): string {
  return extractLabeled(text, "Department", "Division", "Team", "Function");
}

/** Extract skills as bullet/comma list items from a "skills" or "requirements" block */
function extractSkillsFromText(text: string): string[] {
  const skills: Set<string> = new Set();

  // Find skill sections and grab bullet items
  const sectionRe = /(?:technical\s+skills?|key\s+skills?|required\s+skills?|skills?\s*(?:&|and)\s*qualifications?|requirements?|competenc(?:y|ies)|tools?\s*(?:&|and)\s*technologies?)[^\n]*\n([\s\S]{0,1200}?)(?=\n[A-Z][A-Z\s]{3,}|\n\d\.\s|\n#{1,3}|$)/gi;

  let sectionMatch;
  while ((sectionMatch = sectionRe.exec(text)) !== null) {
    const block = sectionMatch[1];
    // Extract items after -, •, *, numbered, or comma-separated
    const items = block.split(/\n|;|,(?!\s+\d)/).map((s) => s.replace(/^[\s\-\*\•\·\d\.]+/, "").trim()).filter((s) => s.length > 2 && s.length < 100);
    items.forEach((i) => skills.add(i));
  }

  // Also extract parenthetical tool lists like "(SAP, Oracle, M365)"
  const toolLists = text.matchAll(/\(([A-Z][A-Za-z0-9\s,\/\-]+)\)/g);
  for (const m of toolLists) {
    m[1].split(",").map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 50).forEach((t) => skills.add(t));
  }

  return Array.from(skills).filter(Boolean).slice(0, 30);
}

export async function parseJobDescription(jdText: string): Promise<ParsedJobDescription> {
  const cleaned = cleanJDText(jdText);
  const fallbackRef = `JD-${Date.now()}`;

  // ── Step 1: Regex extraction for explicitly labeled fields ──────────────
  const regexTitle = extractTitle(cleaned);
  const regexDept = extractDepartment(cleaned);
  const regexExperience = extractLabeled(
    cleaned,
    "Experience required",
    "Experience",
    "Years of experience",
    "Minimum experience",
    "Work experience"
  );
  const regexEducation = extractLabeled(
    cleaned,
    "Education required",
    "Education",
    "Qualification",
    "Minimum qualification",
    "Academic qualification",
    "Degree required"
  );
  const regexSkills = extractSkillsFromText(cleaned);

  console.log("JD regex extraction:", {
    title: regexTitle,
    dept: regexDept,
    experience: regexExperience,
    education: regexEducation,
    skillsCount: regexSkills.length,
    skills: regexSkills.slice(0, 5),
  });

  // ── Step 2: AI extraction (always run, merge with regex) ─────────────────
  let aiTitle = "";
  let aiDept = "";
  let aiExperience = "";
  let aiEducation = "";
  let aiSkills: string[] = [];
  let aiRef = "";

  try {
    const client = getOpenAIClient();

    const prompt = `Extract the following fields from the job description and return ONLY a JSON object.

JOB DESCRIPTION TEXT:
${cleaned.substring(0, 6000)}

Return this JSON with no other text:
{"title":"job title here","department":"department name or empty string","jobRefNumber":"ref code or empty string","requiredSkills":["skill1","skill2","skill3"],"experienceRequired":"years and type of experience","educationRequired":"degree or certification required"}

Rules:
- title: the job title exactly as written
- department: department or team name if mentioned
- jobRefNumber: any reference/requisition code, else ""
- requiredSkills: list every skill, tool, technology, certification mentioned anywhere
- experienceRequired: summarise all experience requirements in one string
- educationRequired: summarise all education/certification requirements in one string`;

    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { role: "system", content: "You are a JSON extraction tool. Respond with valid JSON only. No markdown, no explanation." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 1500,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    console.log("JD AI raw response:", raw.substring(0, 600));
    const parsed = safeParseJSON(raw);

    if (parsed) {
      aiTitle = typeof parsed.title === "string" ? parsed.title.trim() : "";
      aiDept = typeof parsed.department === "string" ? parsed.department.trim() : "";
      aiRef = typeof parsed.jobRefNumber === "string" ? parsed.jobRefNumber.trim() : "";
      aiExperience = typeof parsed.experienceRequired === "string" ? parsed.experienceRequired.trim() : "";
      aiEducation = typeof parsed.educationRequired === "string" ? parsed.educationRequired.trim() : "";
      aiSkills = Array.isArray(parsed.requiredSkills)
        ? (parsed.requiredSkills as unknown[]).filter((s) => typeof s === "string" && s.trim().length > 1).map((s) => (s as string).trim())
        : [];
    }
  } catch (err) {
    console.warn("JD AI extraction failed, using regex only:", err instanceof Error ? err.message : err);
  }

  // ── Step 3: Merge — prefer AI result if non-empty, else fall back to regex ──
  const mergedSkills = Array.from(new Set([...aiSkills, ...regexSkills])).filter(Boolean).slice(0, 30);
  const finalTitle = (aiTitle && aiTitle.length > 2) ? aiTitle : regexTitle || "Extracted Job Title";
  const finalDept = aiDept || regexDept;
  const finalExperience = aiExperience || regexExperience;
  const finalEducation = aiEducation || regexEducation;
  const finalRef = aiRef || fallbackRef;

  console.log("JD final merged result:", {
    title: finalTitle,
    dept: finalDept,
    skillsCount: mergedSkills.length,
    experience: finalExperience,
    education: finalEducation,
  });

  return {
    title: finalTitle,
    department: finalDept,
    jobRefNumber: finalRef,
    description: jdText,
    requiredSkills: mergedSkills,
    experienceRequired: finalExperience,
    educationRequired: finalEducation,
  };
}

export interface ParsedCandidate {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  skills: string[];
  experience: Array<{ title?: string; company?: string; duration?: string; description?: string }>;
  education: Array<{ degree?: string; institution?: string; year?: string }>;
  tokens?: number;
}

export interface ScreeningEvaluation {
  atsScore: number;
  suitabilityScore: number;
  matchingSkills: string[];
  skillGaps: string[];
  experienceMatch: string;
  aiSummary: string;
  tokens?: number;
}

export async function parseCandidateInfo(resumeText: string): Promise<ParsedCandidate> {
  const client = getOpenAIClient();

  const prompt = `Extract structured information from the following resume. Return ONLY a valid JSON object — no markdown, no explanation, no code fences.

Fields to extract:
- name: full name (string or null)
- email: email address (string or null)
- phone: phone number (string or null)
- address: city/country/location (string or null)
- skills: array of ALL skills mentioned — technical, domain, tools, soft skills
- experience: array of work entries, each: {title, company, duration, description}
- education: array of education entries, each: {degree, institution, year}

Resume:
${resumeText.substring(0, 8000)}

Return ONLY the JSON object:`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: "system",
        content: "You are a precise data extraction assistant. Always output valid JSON only. Never add markdown or commentary.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0,
    max_tokens: 2000,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const tokens = response.usage?.total_tokens ?? 0;
  const parsed = safeParseJSON(raw);

  if (!parsed) {
    console.warn("parseCandidateInfo: Failed to parse JSON response:", raw.substring(0, 200));
    return { skills: [], experience: [], education: [], tokens };
  }

  return {
    name: typeof parsed.name === "string" ? parsed.name : undefined,
    email: typeof parsed.email === "string" ? parsed.email : undefined,
    phone: typeof parsed.phone === "string" ? parsed.phone : undefined,
    address: typeof parsed.address === "string" ? parsed.address : undefined,
    skills: Array.isArray(parsed.skills) ? (parsed.skills as string[]) : [],
    experience: Array.isArray(parsed.experience) ? (parsed.experience as ParsedCandidate["experience"]) : [],
    education: Array.isArray(parsed.education) ? (parsed.education as ParsedCandidate["education"]) : [],
    tokens,
  };
}

export async function evaluateAgainstJob(
  resumeText: string,
  jobDescription: string,
  requiredSkills: string[],
  experienceRequired?: string,
  educationRequired?: string
): Promise<ScreeningEvaluation> {
  const client = getOpenAIClient();

  const prompt = `You are a senior HR recruiter and ATS (Applicant Tracking System) expert. Evaluate the resume against the job requirements below and return a JSON object.

═══════════════════ JOB REQUIREMENTS ═══════════════════
${jobDescription}

REQUIRED SKILLS: ${requiredSkills.length > 0 ? requiredSkills.join(", ") : "Not specified — evaluate general domain fit"}
EXPERIENCE NEEDED: ${experienceRequired || "Not specified"}
EDUCATION NEEDED: ${educationRequired || "Not specified"}

═══════════════════ CANDIDATE RESUME ═══════════════════
${resumeText.substring(0, 6000)}

═══════════════════ SCORING INSTRUCTIONS ═══════════════════
You MUST return non-zero scores for any resume that has readable career content.

atsScore (integer 0-100) — Keyword and skills alignment:
  80-100 = Excellent: 80%+ of required skills present, strong keyword overlap
  60-79  = Good: 50-79% skills present, relevant domain experience
  35-59  = Moderate: Some matching skills, relevant industry background
  10-34  = Low: Few matching skills but resume is readable and has career content
  0      = ONLY if the resume text is blank, gibberish, or completely unreadable

suitabilityScore (integer 0-100) — Overall candidate fit:
  80-100 = Exceptional fit: Exceeds most requirements
  60-79  = Strong fit: Meets core requirements well
  35-59  = Partial fit: Relevant experience but with significant gaps
  10-34  = Weak fit: Some relevant background but mostly misaligned
  0      = ONLY if resume has no readable career content

RULE: If the resume contains a real person's career history (even if not a perfect match), BOTH scores must be ≥ 10. A partial or career-changer resume with 10+ years of experience should score at minimum 30-40.

Return ONLY this JSON (no markdown, no extra text):
{
  "atsScore": <integer 0-100>,
  "suitabilityScore": <integer 0-100>,
  "matchingSkills": ["skill1", "skill2", ...],
  "skillGaps": ["missing_skill1", "missing_skill2", ...],
  "experienceMatch": "<1-2 sentence honest assessment>",
  "aiSummary": "<3 paragraph professional evaluation: candidate strengths, match quality, recommendation>"
}`;

  let raw = "";
  try {
    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        {
          role: "system",
          content: "You are an expert ATS evaluator. Output ONLY valid JSON. Never use markdown. Always give non-zero scores for resumes with readable career content.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2500,
    });

    raw = response.choices[0]?.message?.content ?? "{}";
    const tokens = response.usage?.total_tokens ?? 0;
    console.log("AI evaluation raw response (first 300 chars):", raw.substring(0, 300));

    const parsed = safeParseJSON(raw);

    if (!parsed) {
      console.error("evaluateAgainstJob: JSON parse failed. Raw:", raw.substring(0, 500));
      throw new Error("AI returned invalid JSON");
    }

    const atsScore = typeof parsed.atsScore === "number" ? Math.round(Math.max(0, Math.min(100, parsed.atsScore))) : 0;
    const suitabilityScore = typeof parsed.suitabilityScore === "number" ? Math.round(Math.max(0, Math.min(100, parsed.suitabilityScore))) : 0;

    // Warn if both scores are 0 despite having text — this suggests a parsing or AI issue
    if (atsScore === 0 && suitabilityScore === 0 && resumeText.length > MIN_READABLE_TEXT_LENGTH) {
      console.warn(`evaluateAgainstJob: Both scores are 0 for resume with ${resumeText.length} chars of text. Possible AI issue.`);
    }

    return {
      atsScore,
      suitabilityScore,
      matchingSkills: Array.isArray(parsed.matchingSkills) ? (parsed.matchingSkills as string[]) : [],
      skillGaps: Array.isArray(parsed.skillGaps) ? (parsed.skillGaps as string[]) : [],
      experienceMatch: typeof parsed.experienceMatch === "string" ? parsed.experienceMatch : "Unable to assess",
      aiSummary: typeof parsed.aiSummary === "string" ? parsed.aiSummary : "No summary available",
      tokens,
    };
  } catch (err) {
    console.error("evaluateAgainstJob error:", err, "| Raw:", raw.substring(0, 300));
    throw err; // Let the caller handle by marking as failed
  }
}
