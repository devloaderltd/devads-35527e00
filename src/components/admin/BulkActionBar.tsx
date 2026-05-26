import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Action = { label: string; onClick: () => void; variant?: "default" | "destructive" | "outline" };

type Props = {
  count: number;
  onClear: () => void;
  actions: Action[];
};

export function BulkActionBar({ count, onClear, actions }: Props) {
  if (!count) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-full border border-white/15 bg-slate-900/95 px-3 py-2 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={onClear}
          className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-slate-100"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-xs text-slate-300">
          <span className="font-semibold text-slate-100">{count}</span> selected
        </span>
        <div className="flex gap-2">
          {actions.map((a, i) => (
            <Button
              key={i}
              size="sm"
              variant={a.variant ?? "outline"}
              onClick={a.onClick}
              className="h-7 rounded-full text-xs"
            >
              {a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
