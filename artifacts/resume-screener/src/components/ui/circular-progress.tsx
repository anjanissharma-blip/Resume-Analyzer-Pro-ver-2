import { clsx } from "clsx";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

export function CircularProgress({ 
  value, 
  size = 80, 
  strokeWidth = 8,
  className,
  label
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  let colorClass = "text-red-500";
  if (value >= 70) colorClass = "text-green-500";
  else if (value >= 40) colorClass = "text-yellow-500";

  return (
    <div className={clsx("relative flex flex-col items-center justify-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            className="text-slate-100"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress Circle */}
          <circle
            className={clsx("transition-all duration-1000 ease-out", colorClass)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-bold text-lg text-foreground">{value}</span>
        </div>
      </div>
      {label && <span className="mt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>}
    </div>
  );
}
