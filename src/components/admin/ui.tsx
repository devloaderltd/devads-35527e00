import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const panelCls =
  "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur supports-[backdrop-filter]:bg-white/[0.04]";

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative mb-5 sm:mb-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-4 -top-8 h-32 w-72 rounded-full bg-indigo-500/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100 break-words sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  children,
  actions,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`${panelCls} border-0 ${className ?? ""}`}>
      {title && (
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-slate-100">{title}</CardTitle>
          {actions}
        </CardHeader>
      )}
      <CardContent className={title ? "" : "pt-6"}>{children}</CardContent>
    </Card>
  );
}
