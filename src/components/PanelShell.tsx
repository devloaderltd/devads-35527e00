import { ReactNode } from "react";

export function PanelShell({
  title,
  highlight,
  subtitle,
  action,
  children,
  size = "md",
}: {
  title: string;
  highlight?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const max = size === "sm" ? "max-w-3xl" : size === "lg" ? "max-w-7xl" : "max-w-6xl";
  return (
    <div className={`container mx-auto ${max} px-3 py-6 sm:px-4 sm:py-8`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {title} {highlight && <span className="gradient-text">{highlight}</span>}
          </h1>
          {subtitle && <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
