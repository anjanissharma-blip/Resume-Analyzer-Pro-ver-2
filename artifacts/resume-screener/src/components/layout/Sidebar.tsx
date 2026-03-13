import { Link, useLocation } from "wouter";
import { LayoutDashboard, Briefcase, UploadCloud, BarChart3, Settings, Bot, FilePlus2 } from "lucide-react";
import { clsx } from "clsx";

const mainLinks = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, exact: true },
  { name: "Jobs & Screenings", path: "/jobs", icon: Briefcase, exact: false },
];

const actionLinks = [
  { name: "Job Profile", path: "/jobs/new", icon: FilePlus2, exact: true },
  { name: "Resume Upload", path: "/upload", icon: UploadCloud, exact: false },
  { name: "Reports", path: "/reports", icon: BarChart3, exact: false },
];

export function Sidebar() {
  const [location] = useLocation();

  const isActive = (path: string, exact: boolean) =>
    exact ? location === path : location === path || location.startsWith(path + "/");

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl z-20 hidden md:flex shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border gap-3 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
          <Bot size={20} />
        </div>
        <span className="font-display font-bold text-xl tracking-tight">
          Recruit<span className="text-primary">AI</span>
        </span>
      </div>

      <div className="flex-1 py-6 px-4 flex flex-col gap-6 overflow-y-auto">
        {/* Main navigation */}
        <nav>
          <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-2">Menu</p>
          <div className="flex flex-col gap-0.5">
            {mainLinks.map(link => {
              const active = isActive(link.path, link.exact);
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <link.icon
                    size={18}
                    className={active ? "text-primary" : "text-sidebar-foreground/50"}
                  />
                  {link.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Quick actions */}
        <nav>
          <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-2">Quick Actions</p>
          <div className="flex flex-col gap-0.5">
            {actionLinks.map(link => {
              const active = isActive(link.path, link.exact);
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <link.icon
                    size={18}
                    className={active ? "text-primary" : "text-sidebar-foreground/50"}
                  />
                  {link.name}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Bottom settings */}
      <div className="p-4 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 cursor-pointer transition-colors">
          <Settings size={18} className="text-sidebar-foreground/50" />
          Settings
        </div>
      </div>
    </aside>
  );
}
