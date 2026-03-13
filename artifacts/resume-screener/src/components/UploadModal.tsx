import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, X, File, CheckCircle } from "lucide-react";
import { useUploadResumesMutation } from "@/hooks/use-resumes";
import { clsx } from "clsx";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}

export function UploadModal({ isOpen, onClose, jobId }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const uploadMutation = useUploadResumesMutation(jobId);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxSize: 20 * 1024 * 1024 // 20MB
  });

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (files.length === 0) return;
    
    uploadMutation.mutate({
      data: { jobId, files }
    }, {
      onSuccess: () => {
        setFiles([]);
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <div className="p-6 bg-card">
          <DialogHeader className="mb-6">
            <DialogTitle className="font-display text-2xl">Upload Resumes</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Select or drag PDF, DOCX, or TXT files to attach to this job reference.
            </DialogDescription>
          </DialogHeader>

          <div 
            {...getRootProps()} 
            className={clsx(
              "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors duration-200",
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-slate-50"
            )}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <UploadCloud size={32} />
            </div>
            <p className="font-semibold text-lg text-foreground mb-1">
              {isDragActive ? "Drop resumes here..." : "Drag & drop files"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse from your computer
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Supported formats: PDF, DOCX, TXT. Max 20MB per file.
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-6 max-h-48 overflow-y-auto pr-2 space-y-2">
              <div className="text-sm font-semibold text-foreground mb-2 flex items-center justify-between">
                <span>Selected Files ({files.length})</span>
                <span className="text-primary cursor-pointer hover:underline" onClick={() => setFiles([])}>Clear all</span>
              </div>
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <File size={16} className="text-slate-400 shrink-0" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                  </div>
                  <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-destructive shrink-0 ml-2">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-border bg-slate-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={uploadMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={files.length === 0 || uploadMutation.isPending}
            className="bg-primary hover:bg-primary/90 min-w-32 shadow-md hover:shadow-lg transition-all"
          >
            {uploadMutation.isPending ? "Uploading..." : `Upload ${files.length > 0 ? files.length : ''} Files`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
