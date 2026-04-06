import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface BillingSettings {
  rate_resume_scan:         string;
  rate_resume_rescan:       string;
  rate_consolidated_report: string;
  rate_individual_report:   string;
  rate_job_creation:        string;
}

export interface CostStats {
  totalCost:         number;
  scanCost:          number;
  rescanCost:        number;
  jobCost:           number;
  printCost:         number;
  firstScanCount:    number;
  rescanCount:       number;
  jobCount:          number;
  individualPrints:  number;
  consolidatedPrints: number;
  rates: {
    rateScan:         number;
    rateRescan:       number;
    rateConsolidated: number;
    rateIndividual:   number;
    rateJob:          number;
  };
  perJob: Array<{
    jobId: string;
    jobTitle: string;
    jobRefNumber: string;
    firstScanCount: number;
    rescanCount:    number;
    cost:           number;
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

export async function trackPrint(type: "individual" | "consolidated", jobId?: string) {
  try {
    await fetch(`${BASE}/billing/track-print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, jobId }),
    });
  } catch {
    // non-fatal
  }
}
