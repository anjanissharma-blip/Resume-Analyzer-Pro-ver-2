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
              <div className="h-20 flex items-center px-6 border-b border-sidebar-border gap-3">
                <img src="/uttarayan_logo.jpeg" alt="Uttarayan" className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex flex-col leading-tight">
                  <span className="font-display font-bold text-base text-white">Uttarayan</span>
                  <span className="font-display font-semibold text-xs text-primary">Recruit</span>
                </div>
              </div>
              <div className="py-6 px-4 flex flex-col gap-2">
                <a href="/" className="px-3 py-2 rounded-lg bg-sidebar-accent font-medium">Dashboard</a>
                <a href="/jobs" className="px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50">Jobs</a>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 ml-2">
            <img src="/uttarayan_logo.jpeg" alt="Uttarayan" className="w-7 h-7 rounded object-cover" />
            <span className="font-display font-bold text-lg">Uttarayan <span className="text-primary">Recruit</span></span>
          </div>
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
