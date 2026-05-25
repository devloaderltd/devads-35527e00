import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const panelCls = "rounded-2xl border border-white/10 bg-white/5 backdrop-blur";

export function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-100 sm:text-3xl">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 sm:text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, actions, className }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
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
