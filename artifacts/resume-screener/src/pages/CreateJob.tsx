import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateJobMutation } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";

export function CreateJob() {
  const [, setLocation] = useLocation();
  const createMutation = useCreateJobMutation();
  
  const [formData, setFormData] = useState({
    jobRefNumber: "",
    title: "",
    department: "",
    description: "",
    skillsInput: "",
    experienceRequired: "",
    educationRequired: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredSkills = formData.skillsInput
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    createMutation.mutate({
      data: {
        jobRefNumber: formData.jobRefNumber,
        title: formData.title,
        department: formData.department,
        description: formData.description,
        requiredSkills,
        experienceRequired: formData.experienceRequired,
        educationRequired: formData.educationRequired
      }
    }, {
      onSuccess: () => setLocation("/jobs")
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <Link href="/jobs" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back to Jobs
      </Link>
      
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Create New Job Reference</h1>
        <p className="text-muted-foreground mt-1">Define the role requirements for the AI to screen against.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Job Reference Number <span className="text-destructive">*</span></label>
              <input 
                required
                name="jobRefNumber"
                value={formData.jobRefNumber}
                onChange={handleChange}
                placeholder="e.g. REQ-2024-001"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Job Title <span className="text-destructive">*</span></label>
              <input 
                required
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Department</label>
              <input 
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Engineering"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Job Description <span className="text-destructive">*</span></label>
            <textarea 
              required
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={6}
              placeholder="Paste the full job description here. The AI will use this to evaluate candidates."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Required Skills</label>
            <input 
              name="skillsInput"
              value={formData.skillsInput}
              onChange={handleChange}
              placeholder="React, TypeScript, Next.js, CSS (comma separated)"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <p className="text-xs text-muted-foreground">The AI will specifically check resumes against these skills.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Experience Required</label>
              <input 
                name="experienceRequired"
                value={formData.experienceRequired}
                onChange={handleChange}
                placeholder="e.g. 5+ years in frontend development"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Education Required</label>
              <input 
                name="educationRequired"
                value={formData.educationRequired}
                onChange={handleChange}
                placeholder="e.g. BS in Computer Science"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-border flex justify-end gap-4">
          <Link href="/jobs">
            <Button type="button" variant="outline" className="px-6 rounded-xl h-11">Cancel</Button>
          </Link>
          <Button 
            type="submit" 
            disabled={createMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-white px-8 rounded-xl h-11 shadow-lg shadow-primary/20 transition-all"
          >
            {createMutation.isPending ? "Saving..." : <><Save size={18} className="mr-2" /> Create Job Reference</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
