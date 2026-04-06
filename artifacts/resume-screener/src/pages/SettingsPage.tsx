import { useState, useEffect } from "react";
import { useBillingSettings, useSaveBillingSettings } from "@/hooks/use-billing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Receipt, Info } from "lucide-react";
import { motion } from "framer-motion";

export function SettingsPage() {
  const { data: settings, isLoading } = useBillingSettings();
  const saveMutation = useSaveBillingSettings();

  const [openaiRate, setOpenaiRate] = useState("");
  const [docRate, setDocRate] = useState("");

  useEffect(() => {
    if (settings) {
      setOpenaiRate(settings.openai_cost_per_1k_tokens);
      setDocRate(settings.doc_intel_cost_per_page);
    }
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      openai_cost_per_1k_tokens: openaiRate,
      doc_intel_cost_per_page: docRate,
    });
  };

  return (
    <div className="space-y-8 pb-10 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure platform preferences and billing rates.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg">Billing Rates</h2>
            <p className="text-sm text-muted-foreground">Set your actual API costs — a 150% margin is applied automatically in the dashboard.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Azure OpenAI — cost per 1,000 tokens (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={openaiRate}
                    onChange={e => setOpenaiRate(e.target.value)}
                    className="field-input pl-7 text-sm w-full"
                    placeholder="0.0100"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  GPT-4o: ~$0.005/1K tokens · GPT-4: ~$0.030/1K tokens · GPT-3.5: ~$0.002/1K tokens
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Azure Document Intelligence — cost per page (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={docRate}
                    onChange={e => setDocRate(e.target.value)}
                    className="field-input pl-7 text-sm w-full"
                    placeholder="0.0015"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Prebuilt Read model: ~$0.0015/page · Custom models may vary.
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800">
                  <span className="font-bold">150% margin</span> is applied on top of these base rates when computing billable amounts in the dashboard. 
                  Billable cost = base cost × 2.5.
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading || saveMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Save size={15} className="mr-2" />
              {saveMutation.isPending ? "Saving…" : "Save Rates"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
