# AI Resume Screening System (RecruitAI)

## Overview

A cloud-connected AI Resume Screening System that allows uploading, parsing, and evaluating resumes against job descriptions using Azure AI services. Built as a pnpm monorepo with an Express backend and React + Vite frontend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Azure Services Used

- **Azure OpenAI** — GPT-powered candidate parsing, ATS evaluation, and AI summaries
- **Azure Document Intelligence** (Form Recognizer) — PDF/DOCX text extraction via `prebuilt-read` model

## Environment Variables Required

- `AZURE_OPENAI_ENDPOINT` — Azure OpenAI resource endpoint
- `AZURE_OPENAI_API_KEY` — Azure OpenAI API key
- `AZURE_OPENAI_DEPLOYMENT_NAME` — GPT deployment name (e.g. gpt-4o)
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` — Document Intelligence endpoint
- `AZURE_DOCUMENT_INTELLIGENCE_API_KEY` — Document Intelligence API key
- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/              # Express 5 API server
│   │   └── src/
│   │       ├── lib/azure.ts     # Azure OpenAI + Document Intelligence clients
│   │       └── routes/
│   │           ├── jobs.ts      # Job reference CRUD
│   │           ├── resumes.ts   # Resume upload + parsing
│   │           ├── screening.ts # AI screening endpoints
│   │           └── reports.ts   # CSV/JSON report download
│   └── resume-screener/         # React + Vite frontend (previewPath: /)
├── lib/
│   ├── api-spec/openapi.yaml    # OpenAPI 3.1 spec (source of truth)
│   ├── api-client-react/        # Generated React Query hooks
│   ├── api-zod/                 # Generated Zod schemas
│   └── db/src/schema/
│       ├── jobs.ts              # Jobs table
│       └── resumes.ts           # Resumes table
```

## Key Features

1. **Upload**: Single or batch upload of PDF, DOCX, TXT resumes (up to 20 files, 20MB each)
2. **Parsing**: Azure Document Intelligence extracts raw text; Azure OpenAI parses name, email, phone, address, skills, experience, education
3. **ATS Scoring**: GPT evaluates ATS keyword match (0–100) and overall suitability (0–100)
4. **Screening Output**: Matching skills, skill gaps, experience match assessment, AI summary
5. **Reports**: Individual candidate JSON report; batch CSV summary per Job Reference Number
6. **Jobs Management**: Create jobs with Job Ref Number, title, department, description, required skills

## API Endpoints

All endpoints prefixed with `/api`:

- `GET /jobs` — list all job references
- `POST /jobs` — create job
- `GET /jobs/:jobId` — get job details
- `DELETE /jobs/:jobId` — delete job
- `GET /jobs/:jobId/resumes` — list resumes for a job
- `POST /resumes/upload` — multipart upload (fields: `files[]`, `jobId`)
- `GET /resumes/:resumeId` — get resume with results
- `DELETE /resumes/:resumeId` — delete resume
- `POST /screening/:resumeId` — screen single resume
- `POST /screening/batch/:jobId` — batch screen all pending resumes
- `GET /reports/resume/:resumeId` — individual candidate report (JSON)
- `GET /reports/batch/:jobId` — batch summary (CSV download)

## Database Schema

### `jobs` table
- id, job_ref_number (unique), title, department, description, required_skills[], experience_required, education_required, status, created_at

### `resumes` table
- id, job_id, file_name, file_type, file_data (base64), status, candidate_name, candidate_email, candidate_phone, candidate_address, skills[], experience (jsonb), education (jsonb), extracted_text, ats_score, suitability_score, matching_skills[], skill_gaps[], experience_match, ai_summary, created_at, screened_at

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push schema changes to database
