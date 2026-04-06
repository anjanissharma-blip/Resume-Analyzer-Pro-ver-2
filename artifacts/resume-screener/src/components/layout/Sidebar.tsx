import { Link, useLocation } from "wouter";
import { LayoutDashboard, UploadCloud, BarChart3, Settings, ClipboardList } from "lucide-react";
import { clsx } from "clsx";

const navLinks = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, exact: true },
  { name: "Job Profile", path: "/jobs", icon: ClipboardList, exact: false },
  { name: "Resume Upload", path: "/upload", icon: UploadCloud, exact: true },
  { name: "Reports", path: "/reports", icon: BarChart3, exact: true },
];

export function Sidebar() {
  const [location] = useLocation();

  const isActive = (path: string, exact: boolean) =>
    exact ? location === path : location === path || location.startsWith(path + "/") || location.startsWith(path);

  return (
    <aside className="w-60 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl z-20 hidden md:flex shrink-0">
      {/* Logo */}
      <div className="h-20 flex items-center px-5 border-b border-sidebar-border gap-3 shrink-0">
        <img
          src="/uttarayan_logo.jpeg"
          alt="Uttarayan"
          className="w-10 h-10 rounded-lg object-cover shadow-lg shadow-primary/30 shrink-0"
        />
        <div className="flex flex-col leading-tight">
          <span className="font-display font-bold text-base tracking-tight text-white">
            Uttarayan
          </span>
          <span className="font-display font-semibold text-xs text-primary tracking-wide">
            Recruit
          </span>
        </div>
      </div>

      <div className="flex-1 py-5 px-3 flex flex-col gap-1 overflow-y-auto">
        <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2 px-2">Navigation</p>
        {navLinks.map(link => {
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
              <link.icon size={17} className={active ? "text-primary" : "text-sidebar-foreground/40"} />
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="p-3 border-t border-sidebar-border shrink-0">
        <Link
          href="/settings"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            location === "/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <Settings size={17} className={location === "/settings" ? "text-primary" : "text-sidebar-foreground/40"} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
