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
    .replace(/[\u2012\u2013\u2014\u2015\u2053\u2212\uFE58\uFE63\uFF0D]/g, "-") // normalize dashes
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function parseJobDescription(jdText: string): Promise<ParsedJobDescription> {
  const client = getOpenAIClient();
  const cleaned = cleanJDText(jdText);

  const prompt = `Read the job description below and extract the requested fields. The text may use bullet points, numbered lists, or plain sentences — handle all formats.

--- START JD ---
${cleaned.substring(0, 8000)}
--- END JD ---

Now extract the following and respond with ONLY a JSON object, nothing else:

1. title: The exact job title (e.g. "Senior Finance Manager")
2. department: The department or team name if stated (e.g. "Finance & Corporate Services"), else ""
3. jobRefNumber: A job/requisition reference code if present (e.g. "REQ-2024-001"), else ""
4. requiredSkills: An array of ALL skills, tools, technologies, certifications and domain expertise mentioned anywhere in the JD. Look in every section including responsibilities, requirements, competencies, nice-to-have. Each skill as a short string.
5. experienceRequired: A single string summarising the experience requirements. Look for phrases like "X years of experience", "prior experience in", "background in", "exposure to". If multiple, join with "; ".
6. educationRequired: A single string summarising the education/qualification requirements. Look for degree names, professional certifications (CA, CPA, MBA, etc.). If multiple, join with "; ".

IMPORTANT:
- Do NOT leave requiredSkills as an empty array if any skills are mentioned anywhere in the JD.
- Do NOT leave experienceRequired empty if any experience requirement is mentioned.
- Do NOT leave educationRequired empty if any qualification is mentioned.
- Extract from ALL sections — responsibilities often imply required skills.

Respond with ONLY this JSON structure:
{"title":"...","department":"...","jobRefNumber":"...","requiredSkills":["...","..."],"experienceRequired":"...","educationRequired":"..."}`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: "system",
        content: "You extract structured data from job descriptions. Output ONLY valid JSON. No markdown, no explanation, no code fences. Fill every field based on what is actually in the text.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0,
    max_tokens: 2000,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  console.log("JD parse raw AI response:", raw.substring(0, 500));
  const parsed = safeParseJSON(raw);

  const fallbackRef = `JD-${Date.now()}`;

  if (!parsed) {
    console.warn("parseJobDescription: failed to parse JSON, raw:", raw.substring(0, 300));
    return {
      title: "Extracted Job Title",
      department: "",
      jobRefNumber: fallbackRef,
      description: jdText,
      requiredSkills: [],
      experienceRequired: "",
      educationRequired: "",
    };
  }

  console.log("JD parsed result:", {
    title: parsed.title,
    department: parsed.department,
    skillsCount: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills.length : 0,
    experienceRequired: parsed.experienceRequired,
    educationRequired: parsed.educationRequired,
  });

  return {
    title: typeof parsed.title === "string" && parsed.title ? parsed.title : "Extracted Job Title",
    department: typeof parsed.department === "string" ? parsed.department : "",
    jobRefNumber: typeof parsed.jobRefNumber === "string" && parsed.jobRefNumber ? parsed.jobRefNumber : fallbackRef,
    description: jdText,
    requiredSkills: Array.isArray(parsed.requiredSkills) ? (parsed.requiredSkills as string[]).filter(Boolean) : [],
    experienceRequired: typeof parsed.experienceRequired === "string" ? parsed.experienceRequired : "",
    educationRequired: typeof parsed.educationRequired === "string" ? parsed.educationRequired : "",
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
