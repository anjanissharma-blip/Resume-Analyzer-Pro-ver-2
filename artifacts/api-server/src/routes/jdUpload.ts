import express from "express";
import multer from "multer";
import { extractTextFromFile } from "../lib/fileTextExtractor";
import { parseJobDescription } from "../lib/azure";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post("/jobs/upload-jd", upload.single("jd"), async (req, res) => {
  try {
    console.log("JD upload route triggered");

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File received:", req.file.originalname);

    // Extract text — plain text files read directly, PDF/DOCX via Azure Doc Intelligence
    const ext = (req.file.originalname ?? "").split(".").pop()?.toLowerCase();
    let jdText: string;
    if (ext === "txt") {
      jdText = req.file.buffer.toString("utf-8");
    } else {
      jdText = await extractTextFromFile(req.file);
    }

    console.log("Extracted JD length:", jdText.length);

    if (!jdText || jdText.trim().length < 50) {
      return res.status(422).json({
        error: "Could not extract readable text from the file. Try a PDF, DOCX, or TXT.",
      });
    }

    // Real AI + regex hybrid parsing (azure.ts)
    const parsed = await parseJobDescription(jdText);

    console.log("JD parsed result:", {
      title: parsed.title,
      department: parsed.department,
      skillsCount: parsed.requiredSkills.length,
      skills: parsed.requiredSkills.slice(0, 5),
      experienceRequired: parsed.experienceRequired,
      educationRequired: parsed.educationRequired,
    });

    res.json(parsed);
  } catch (error) {
    console.error("JD Upload Error:", error);
    res.status(500).json({
      error: "JD parsing failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
