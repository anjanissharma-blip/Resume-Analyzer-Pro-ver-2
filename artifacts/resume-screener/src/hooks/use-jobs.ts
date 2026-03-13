import { useQueryClient } from "@tanstack/react-query";
import { 
  useListJobs, 
  useGetJob, 
  useCreateJob, 
  useDeleteJob,
  getListJobsQueryKey,
  getGetJobQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CreateJobRequest } from "@workspace/api-client-react/src/generated/api.schemas";

export function useJobsData() {
  return useListJobs();
}

export function useJobData(id: string) {
  return useGetJob(id, { query: { enabled: !!id } });
}

export function useCreateJobMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useCreateJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        toast({
          title: "Job created",
          description: "The job reference was successfully created.",
        });
      },
      onError: (err) => {
        toast({
          title: "Error creating job",
          description: err instanceof Error ? err.message : "An unexpected error occurred.",
          variant: "destructive"
        });
      }
    }
  });
}

export function useDeleteJobMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useDeleteJob({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        queryClient.removeQueries({ queryKey: getGetJobQueryKey(variables.jobId) });
        toast({
          title: "Job deleted",
          description: "The job reference has been removed.",
        });
      },
      onError: (err) => {
        toast({
          title: "Error deleting job",
          description: err instanceof Error ? err.message : "An unexpected error occurred.",
          variant: "destructive"
        });
      }
    }
  });
}
