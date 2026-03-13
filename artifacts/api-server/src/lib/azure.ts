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

export interface ParsedCandidate {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  skills: string[];
  experience: Array<{ title?: string; company?: string; duration?: string; description?: string }>;
  education: Array<{ degree?: string; institution?: string; year?: string }>;
}

export interface ScreeningEvaluation {
  atsScore: number;
  suitabilityScore: number;
  matchingSkills: string[];
  skillGaps: string[];
  experienceMatch: string;
  aiSummary: string;
}

export async function parseCandidateInfo(resumeText: string): Promise<ParsedCandidate> {
  const client = getOpenAIClient();
  const prompt = `Extract structured information from the following resume text. Return a JSON object with these fields:
- name: full name of candidate (string or null)
- email: email address (string or null)
- phone: phone number (string or null)
- address: address/location (string or null)
- skills: array of technical and soft skills found
- experience: array of work experiences, each with {title, company, duration, description}
- education: array of education entries, each with {degree, institution, year}

Resume text:
${resumeText.substring(0, 8000)}

Respond with ONLY valid JSON, no markdown, no explanation.`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      name: parsed.name ?? undefined,
      email: parsed.email ?? undefined,
      phone: parsed.phone ?? undefined,
      address: parsed.address ?? undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
    };
  } catch {
    return { skills: [], experience: [], education: [] };
  }
}

export async function evaluateAgainstJob(
  resumeText: string,
  jobDescription: string,
  requiredSkills: string[],
  experienceRequired?: string,
  educationRequired?: string
): Promise<ScreeningEvaluation> {
  const client = getOpenAIClient();
  const prompt = `You are an expert ATS (Applicant Tracking System) evaluator. Evaluate the following resume against the job description and return a JSON object.

JOB DESCRIPTION:
${jobDescription}

REQUIRED SKILLS: ${requiredSkills.join(", ") || "Not specified"}
EXPERIENCE REQUIRED: ${experienceRequired || "Not specified"}
EDUCATION REQUIRED: ${educationRequired || "Not specified"}

RESUME:
${resumeText.substring(0, 6000)}

Return a JSON object with these fields:
- atsScore: number 0-100 (how well resume passes ATS keyword matching)
- suitabilityScore: number 0-100 (overall candidate suitability for the role)
- matchingSkills: array of skills from the resume that match the job requirements
- skillGaps: array of required skills missing from the resume
- experienceMatch: string describing how well candidate's experience matches (e.g. "Strong match - 5 years relevant experience")
- aiSummary: 2-3 paragraph professional assessment of the candidate for this role

Respond with ONLY valid JSON, no markdown, no explanation.`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      atsScore: typeof parsed.atsScore === "number" ? Math.max(0, Math.min(100, parsed.atsScore)) : 0,
      suitabilityScore: typeof parsed.suitabilityScore === "number" ? Math.max(0, Math.min(100, parsed.suitabilityScore)) : 0,
      matchingSkills: Array.isArray(parsed.matchingSkills) ? parsed.matchingSkills : [],
      skillGaps: Array.isArray(parsed.skillGaps) ? parsed.skillGaps : [],
      experienceMatch: parsed.experienceMatch ?? "Unable to assess",
      aiSummary: parsed.aiSummary ?? "No summary available",
    };
  } catch {
    return {
      atsScore: 0,
      suitabilityScore: 0,
      matchingSkills: [],
      skillGaps: [],
      experienceMatch: "Unable to assess",
      aiSummary: "Evaluation failed",
    };
  }
}
