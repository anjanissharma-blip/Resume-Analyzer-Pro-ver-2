import { useState, useEffect } from "react";
import { useBillingSettings, useSaveBillingSettings } from "@/hooks/use-billing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Receipt, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CORRECT_PASSWORD = "aces2026";

interface RateFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}

function RateField({ label, description, value, onChange }: RateFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="field-input pl-7 text-sm w-full"
        />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function SettingsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState(false);

  const { data: settings, isLoading } = useBillingSettings();
  const saveMutation = useSaveBillingSettings();

  const [rateScan,         setRateScan]         = useState("");
  const [rateRescan,       setRateRescan]        = useState("");
  const [rateConsolidated, setRateConsolidated]  = useState("");
  const [rateIndividual,   setRateIndividual]    = useState("");
  const [rateJob,          setRateJob]           = useState("");

  useEffect(() => {
    if (settings) {
      setRateScan(settings.rate_resume_scan);
      setRateRescan(settings.rate_resume_rescan);
      setRateConsolidated(settings.rate_consolidated_report);
      setRateIndividual(settings.rate_individual_report);
      setRateJob(settings.rate_job_creation);
    }
  }, [settings]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setUnlocked(true);
      setPwError(false);
    } else {
      setPwError(true);
      setPassword("");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      rate_resume_scan:         rateScan,
      rate_resume_rescan:       rateRescan,
      rate_consolidated_report: rateConsolidated,
      rate_individual_report:   rateIndividual,
      rate_job_creation:        rateJob,
    });
  };

  return (
    <div className="space-y-8 pb-10 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure platform billing rates.</p>
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
            <p className="text-sm text-muted-foreground">Flat-rate pricing per billable action on this platform.</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!unlocked ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center gap-6"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Lock size={28} className="text-slate-400" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-foreground text-lg mb-1">Password Required</h3>
                <p className="text-sm text-muted-foreground">Enter the settings password to view and modify billing rates.</p>
              </div>
              <form onSubmit={handleUnlock} className="w-full max-w-xs space-y-3">
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPwError(false); }}
                    placeholder="Enter password"
                    className={`field-input w-full pr-10 text-sm ${pwError ? "border-red-400 focus:ring-red-400" : ""}`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwError && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle size={14} /> Incorrect password
                  </div>
                )}
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white">
                  <Lock size={14} className="mr-2" /> Unlock Settings
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="unlocked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <form onSubmit={handleSave} className="p-6 space-y-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
                  </div>
                ) : (
                  <>
                    <RateField
                      label="Resume Scan — charge per resume screened (first time)"
                      description="Applied once per resume when it is screened for the first time."
                      value={rateScan}
                      onChange={setRateScan}
                    />
                    <RateField
                      label="Resume Re-scan — charge per resume re-evaluated"
                      description="Applied when a resume is re-screened after editing the job profile."
                      value={rateRescan}
                      onChange={setRateRescan}
                    />
                    <RateField
                      label="Consolidated Report Print — charge per batch PDF download"
                      description="Applied each time an all-candidates consolidated PDF is generated."
                      value={rateConsolidated}
                      onChange={setRateConsolidated}
                    />
                    <RateField
                      label="Individual Report Print — charge per single-candidate PDF"
                      description="Applied each time a single candidate PDF report is downloaded."
                      value={rateIndividual}
                      onChange={setRateIndividual}
                    />
                    <RateField
                      label="Job Profile Creation — charge per new job profile"
                      description="Applied each time a new job profile is created on the platform."
                      value={rateJob}
                      onChange={setRateJob}
                    />
                  </>
                )}
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setUnlocked(false)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Lock Settings
                  </button>
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
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
