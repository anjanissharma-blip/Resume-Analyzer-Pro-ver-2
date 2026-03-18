import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
  defaultQuery: { "api-version": "2024-02-15-preview" },
  defaultHeaders: {
    "api-key": process.env.AZURE_OPENAI_API_KEY,
  },
});

export async function parseJobDescription(text: string) {
  try {
    const completion = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: [
        {
          role: "system",
          content:
            "You extract structured job data from job descriptions. Return JSON only.",
        },
        {
          role: "user",
          content: `
Extract the following fields from this job description.

Return ONLY valid JSON in this format:

{
"title": "",
"department": "",
"requiredSkills": [],
"experienceRequired": "",
"educationRequired": ""
}

Job Description:
${text}
`,
        },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0].message.content || "{}";

    return JSON.parse(content);
  } catch (error) {
    console.error("AI JD parsing failed:", error);

    return {
      title: "",
      department: "",
      requiredSkills: [],
      experienceRequired: "",
      educationRequired: "",
    };
  }
}
