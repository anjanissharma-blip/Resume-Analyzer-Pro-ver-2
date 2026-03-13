import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-border bg-card flex items-center px-4 shrink-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar border-none text-sidebar-foreground">
              {/* Reuse sidebar styling for mobile sheet */}
              <div className="h-16 flex items-center px-6 border-b border-sidebar-border gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                  <span className="font-bold text-sm">AI</span>
                </div>
                <span className="font-display font-bold text-xl">RecruitAI</span>
              </div>
              <div className="py-6 px-4 flex flex-col gap-2">
                <a href="/" className="px-3 py-2 rounded-lg bg-sidebar-accent font-medium">Dashboard</a>
                <a href="/jobs" className="px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50">Jobs</a>
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-display font-bold text-lg ml-2">Recruit<span className="text-primary">AI</span></span>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
