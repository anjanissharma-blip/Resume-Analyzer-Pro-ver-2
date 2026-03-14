import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useListJobs,
  useGetJob,
  useCreateJob,
  useDeleteJob,
  getListJobsQueryKey,
  getGetJobQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CreateJobRequest } from "@workspace/api-client-react/src/generated/api.schemas";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
        toast({ title: "Job created", description: "Job profile created successfully." });
      },
      onError: (err) => {
        toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create job.", variant: "destructive" });
      },
    },
  });
}

export function useUpdateJobMutation(jobId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Partial<CreateJobRequest["data"]>) => {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });
      toast({ title: "Job updated", description: "Job profile saved successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update job.", variant: "destructive" });
    },
  });
}

export function useUpdateJobStatusMutation(jobId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (status: "active" | "completed") => {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });
      toast({
        title: status === "completed" ? "Job marked complete" : "Job re-activated",
        description: status === "completed" ? "This job is now archived." : "Job is active again.",
      });
    },
    onError: (err) => {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update status.", variant: "destructive" });
    },
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
        toast({ title: "Job deleted", description: "The job profile has been removed." });
      },
      onError: (err) => {
        toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete job.", variant: "destructive" });
      },
    },
  });
}
