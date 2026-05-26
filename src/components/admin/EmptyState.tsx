import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon = Inbox, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-slate-200">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-medium text-slate-100">{title}</div>
        {description && <div className="mt-1 text-xs text-slate-400">{description}</div>}
      </div>
      {action}
    </div>
  );
}
