import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { parseJobDescription } from "../lib/aiJobParser";
import { extractTextFromFile } from "../lib/fileTextExtractor";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

function generateJobId(department?: string) {
  const year = new Date().getFullYear();
  const prefix = department?.substring(0, 3).toUpperCase() || "JOB";
  const random = Math.floor(Math.random() * 1000);

  return `${prefix}-${year}-${random}`;
}

router.post("/jobs/upload-jd", upload.single("jd"), async (req, res) => {
  try {
    console.log("JD upload route triggered");

    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    console.log("File received:", req.file.originalname);

    // Extract text
    const jdText = await extractTextFromFile(req.file);

    console.log("Extracted JD length:", jdText.length);

    // AI parse
    const aiData = {
      title: "Test Title",
      department: "General",
      requiredSkills: [],
      experienceRequired: "",
      educationRequired: "",
    };

    console.log("AI parsed data:", aiData);

    const jobId = generateJobId(aiData?.department);

    const job = {
      id: randomUUID(),
      jobRefNumber: jobId,
      title: aiData?.title || "",
      department: aiData?.department || "",
      description: jdText,
      requiredSkills: aiData?.requiredSkills || [],
      experienceRequired: aiData?.experienceRequired || "",
      educationRequired: aiData?.educationRequired || "",
      status: "active",
    };

    console.log("JOB CREATED:", job);

    res.json(job);
  } catch (error) {
    console.error("JD Upload Error:", error);

    res.status(500).json({
      error: "JD parsing failed",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
    });
  }
});

export default router;
