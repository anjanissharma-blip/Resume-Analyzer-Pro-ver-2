import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface BillingSettings {
  openai_cost_per_1k_tokens: string;
  doc_intel_cost_per_page: string;
}

export interface CostStats {
  totalTokens: number;
  totalDocPages: number;
  totalCost: number;
  baseOpenAICost: number;
  baseDocCost: number;
  reanalysisTokens: number;
  reanalysisDocPages: number;
  reanalysisCost: number;
  computeHours: number;
  screenedCount: number;
  margin: number;
  settings: { openaiRate: number; docIntelRate: number };
  perJob: Array<{
    jobId: string;
    jobTitle: string;
    jobRefNumber: string;
    screenedCount: number;
    tokens: number;
    cost: number;
    reanalysisCount: number;
    reanalysisCost: number;
  }>;
}

const BASE = "/api";

export function useBillingSettings() {
  return useQuery<BillingSettings>({
    queryKey: ["billing-settings"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/billing/settings`);
      if (!res.ok) throw new Error("Failed to fetch billing settings");
      return res.json();
    },
  });
}

export function useSaveBillingSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (settings: Partial<BillingSettings>) => {
      const res = await fetch(`${BASE}/billing/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-settings"] });
      queryClient.invalidateQueries({ queryKey: ["cost-stats"] });
      toast({ title: "Billing rates saved" });
    },
    onError: () => {
      toast({ title: "Save failed", variant: "destructive" });
    },
  });
}

export function useCostStats() {
  return useQuery<CostStats>({
    queryKey: ["cost-stats"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/billing/costs`);
      if (!res.ok) throw new Error("Failed to fetch cost stats");
      return res.json();
    },
    refetchInterval: 30000,
  });
}
