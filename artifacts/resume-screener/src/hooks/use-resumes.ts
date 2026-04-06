import { useQueryClient, useMutation } from "@tanstack/react-query";
import { 
  useListResumesForJob, 
  useGetResume, 
  useUploadResumes,
  useDeleteResume,
  useScreenResume,
  useScreenBatch,
  getListResumesForJobQueryKey,
  getGetResumeQueryKey,
  getListJobsQueryKey,
  getGetJobQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useJobResumes(jobId: string) {
  return useListResumesForJob(jobId, {
    query: {
      enabled: !!jobId,
      // Auto-poll every 5 seconds if any resume is still processing/pending
      refetchInterval: (query) => {
        const data = query.state.data;
        if (Array.isArray(data) && data.some(r => r.status === 'pending' || r.status === 'processing')) {
          return 5000;
        }
        return false;
      }
    }
  });
}

export function useResumeData(resumeId: string) {
  return useGetResume(resumeId, {
    query: { enabled: !!resumeId }
  });
}

export function useUploadResumesMutation(jobId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useUploadResumes({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListResumesForJobQueryKey(jobId) });
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });
        toast({
          title: "Upload successful",
          description: data.message || `${data.uploaded} resumes uploaded and queued.`,
        });
      },
      onError: (err) => {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Failed to upload resumes.",
          variant: "destructive"
        });
      }
    }
  });
}

export function useDeleteResumeMutation(jobId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useDeleteResume({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: getListResumesForJobQueryKey(jobId) });
        queryClient.removeQueries({ queryKey: getGetResumeQueryKey(variables.resumeId) });
        toast({
          title: "Resume deleted",
          description: "The resume has been successfully removed.",
        });
      },
      onError: (err) => {
        toast({
          title: "Delete failed",
          description: err instanceof Error ? err.message : "Failed to delete resume.",
          variant: "destructive"
        });
      }
    }
  });
}

export function useScreenResumeMutation(jobId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useScreenResume({
    mutation: {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: getListResumesForJobQueryKey(jobId) });
        queryClient.invalidateQueries({ queryKey: getGetResumeQueryKey(variables.resumeId) });
        toast({
          title: "Screening complete",
          description: `Score updated: ATS ${data.atsScore}%`,
        });
      },
      onError: (err) => {
        toast({
          title: "Screening failed",
          description: err instanceof Error ? err.message : "Failed to process resume.",
          variant: "destructive"
        });
      }
    }
  });
}

export function useScreenBatchMutation(jobId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useScreenBatch({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListResumesForJobQueryKey(jobId) });
        toast({
          title: "Batch screening started",
          description: data.message || `Queued ${data.total} resumes.`,
        });
      },
      onError: (err) => {
        toast({
          title: "Batch start failed",
          description: err instanceof Error ? err.message : "Failed to start batch.",
          variant: "destructive"
        });
      }
    }
  });
}

export function useRescreenAllMutation(jobId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (jid: string) => {
      const res = await fetch(`/api/screening/rescreen-all/${jid}`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ total: number; message: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getListResumesForJobQueryKey(jobId) });
      toast({
        title: "Re-evaluation started",
        description: data.message || `${data.total} resume(s) queued.`,
      });
    },
    onError: (err) => {
      toast({
        title: "Re-evaluation failed",
        description: err instanceof Error ? err.message : "Could not start re-evaluation.",
        variant: "destructive",
      });
    },
  });
}
