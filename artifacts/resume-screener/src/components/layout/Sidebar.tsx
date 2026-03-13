import { Link, useLocation } from "wouter";
import { LayoutDashboard, Briefcase, FileText, Settings, Bot } from "lucide-react";
import { clsx } from "clsx";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Jobs & Screenings", path: "/jobs", icon: Briefcase },
  ];

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl z-20 hidden md:flex shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border gap-3">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
          <Bot size={20} />
        </div>
        <span className="font-display font-bold text-xl tracking-tight">Recruit<span className="text-primary">AI</span></span>
      </div>

      <div className="flex-1 py-6 px-4 flex flex-col gap-1 overflow-y-auto">
        <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-2">Menu</div>
        {links.map((link) => {
          const isActive = location === link.path || (link.path !== "/" && location.startsWith(link.path));
          
          return (
            <Link 
              key={link.path} 
              href={link.path}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <link.icon size={18} className={isActive ? "text-primary" : "text-sidebar-foreground/50"} />
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 cursor-pointer transition-colors">
          <Settings size={18} className="text-sidebar-foreground/50" />
          Settings
        </div>
      </div>
    </aside>
  );
}
