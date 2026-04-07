import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import {
  useCreateJobMutation,
  useUpdateJobMutation,
  useJobData,
} from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Pencil, Plus, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Link } from "wouter";

interface FormState {
  jobRefNumber: string;
  title: string;
  department: string;
  description: string;
  skillsInput: string;
  experienceRequired: string;
  educationRequired: string;
}

const empty: FormState = {
  jobRefNumber: "",
  title: "",
  department: "",
  description: "",
  skillsInput: "",
  experienceRequired: "",
  educationRequired: "",
};

export function CreateJob() {
  const { jobId } = useParams<{ jobId?: string }>();
  const isEditing = !!jobId;
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<FormState>(empty);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [uploadingJD, setUploadingJD] = useState(false);
  const [jdError, setJdError] = useState<string | null>(null);
  const [jdSuccess, setJdSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: existingJob, isLoading: loadingJob } = useJobData(jobId ?? "");
  const createMutation = useCreateJobMutation();
  const updateMutation = useUpdateJobMutation(jobId ?? "");

  useEffect(() => {
    if (existingJob && isEditing) {
      setForm({
        jobRefNumber: existingJob.jobRefNumber ?? "",
        title: existingJob.title ?? "",
        department: existingJob.department ?? "",
        description: existingJob.description ?? "",
        skillsInput: (existingJob.requiredSkills ?? []).join(", "),
        experienceRequired: existingJob.experienceRequired ?? "",
        educationRequired: existingJob.educationRequired ?? "",
      });
    }
  }, [existingJob, isEditing]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const uploadJD = async () => {
    if (!jdFile) return;
    setJdError(null);
    setJdSuccess(false);
    setUploadingJD(true);
    try {
      const formData = new FormData();
      formData.append("jd", jdFile);
      const res = await fetch("/api/jobs/upload-jd", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setJdError(data.error ?? "JD processing failed. Please try again.");
        return;
      }
      setForm({
        jobRefNumber: data.jobRefNumber ?? "",
        title: data.title ?? "",
        department: data.department ?? "",
        description: data.description ?? "",
        skillsInput: (data.requiredSkills ?? []).join(", "),
        experienceRequired: data.experienceRequired ?? "",
        educationRequired: data.educationRequired ?? "",
      });
      setJdSuccess(true);
    } catch (err) {
      console.error(err);
      setJdError("Network error — please check your connection and try again.");
    } finally {
      setUploadingJD(false);
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredSkills = form.skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      jobRefNumber: form.jobRefNumber,
      title: form.title,
      department: form.department,
      description: form.description,
      requiredSkills,
      experienceRequired: form.experienceRequired,
      educationRequired: form.educationRequired,
    };

    if (isEditing) {
      updateMutation.mutate(
        payload as Parameters<typeof updateMutation.mutate>[0],
        {
          onSuccess: () => setLocation(`/jobs/${jobId}`),
        },
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => setLocation("/jobs"),
        },
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && loadingJob) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-[60vh] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <Link
        href={isEditing ? `/jobs/${jobId}` : "/jobs"}
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} className="mr-2" />{" "}
        {isEditing ? "Back to Job" : "Back to Jobs"}
      </Link>

      <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Upload Job Description</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload a PDF, DOCX, or TXT file — AI will extract the title, required skills, experience, and education automatically, whether stated explicitly or in sentence form.
          </p>
        </div>

        <input
          type="file"
          accept=".pdf,.docx,.txt"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={(e) => {
            setJdFile(e.target.files?.[0] || null);
            setJdError(null);
            setJdSuccess(false);
          }}
        />

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingJD}
          >
            Browse File
          </Button>

          <Button
            type="button"
            onClick={uploadJD}
            disabled={uploadingJD || !jdFile}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {uploadingJD ? (
              <><Loader2 size={15} className="mr-2 animate-spin" /> Analysing JD…</>
            ) : (
              <><Sparkles size={15} className="mr-2" /> Parse with AI</>
            )}
          </Button>

          {jdFile && !uploadingJD && (
            <span className="text-sm text-muted-foreground">{jdFile.name}</span>
          )}
        </div>

        {uploadingJD && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 size={14} className="animate-spin" />
            Extracting text and parsing requirements — this takes a few seconds…
          </div>
        )}

        {jdSuccess && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <Sparkles size={14} />
            Form filled from JD — review and adjust the fields below before saving.
          </div>
        )}

        {jdError && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {jdError}
          </div>
        )}
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          {isEditing ? (
            <>
              <Pencil size={26} className="text-primary" /> Edit Job Profile
            </>
          ) : (
            <>
              <Plus size={26} className="text-primary" /> Create Job Profile
            </>
          )}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isEditing
            ? "Update the role requirements — screening will use the latest description."
            : "Define the role requirements for the AI to screen candidates against."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden"
      >
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Job Reference Number" required>
              <input
                name="jobRefNumber"
                value={form.jobRefNumber}
                onChange={handleChange}
                required
                disabled={isEditing}
                placeholder="e.g. REQ-2024-001"
                className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {isEditing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reference number cannot be changed after creation.
                </p>
              )}
            </Field>

            <Field label="Job Title" required>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                placeholder="e.g. Senior Finance Controller"
                className="field-input"
              />
            </Field>

            <Field label="Department">
              <input
                name="department"
                value={form.department}
                onChange={handleChange}
                placeholder="e.g. Finance"
                className="field-input"
              />
            </Field>
          </div>

          <Field
            label="Job Description"
            required
            hint="The AI uses this full description to evaluate candidates. Be as detailed as possible."
          >
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={8}
              placeholder="Paste the full job description here, including responsibilities, requirements, and context…"
              className="field-input resize-y"
            />
          </Field>

          <Field
            label="Required Skills"
            hint="Comma-separated list. The AI will specifically check resumes against these."
          >
            <input
              name="skillsInput"
              value={form.skillsInput}
              onChange={handleChange}
              placeholder="e.g. Financial Reporting, IFRS, Excel, SAP, FP&A"
              className="field-input"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Experience Required">
              <input
                name="experienceRequired"
                value={form.experienceRequired}
                onChange={handleChange}
                placeholder="e.g. 8+ years in senior finance roles"
                className="field-input"
              />
            </Field>
            <Field label="Education Required">
              <input
                name="educationRequired"
                value={form.educationRequired}
                onChange={handleChange}
                placeholder="e.g. CA / MBA Finance / CFA"
                className="field-input"
              />
            </Field>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-border flex justify-end gap-3">
          <Link href={isEditing ? `/jobs/${jobId}` : "/jobs"}>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-6 rounded-xl"
              disabled={isPending}
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-white h-11 px-8 rounded-xl shadow-lg shadow-primary/20"
          >
            {isPending ? (
              "Saving…"
            ) : (
              <>
                <Save size={17} className="mr-2" />
                {isEditing ? "Save Changes" : "Create Job Profile"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
