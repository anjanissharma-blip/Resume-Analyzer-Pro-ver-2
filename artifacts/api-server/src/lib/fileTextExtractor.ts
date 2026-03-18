import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from "@azure/ai-form-recognizer";

const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT!;
const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY!;

const client = new DocumentAnalysisClient(
  endpoint,
  new AzureKeyCredential(apiKey),
);

export async function extractTextFromFile(
  file: Express.Multer.File,
): Promise<string> {
  try {
    console.log("Sending document to Azure Document Intelligence...");

    const poller = await client.beginAnalyzeDocument(
      "prebuilt-read",
      file.buffer,
    );

    const result = await poller.pollUntilDone();

    if (!result || !result.content) {
      throw new Error("No text extracted from document");
    }

    console.log("Extraction complete. Length:", result.content.length);

    return result.content;
  } catch (error) {
    console.error("Azure Document Intelligence extraction failed:", error);
    throw error;
  }
}
