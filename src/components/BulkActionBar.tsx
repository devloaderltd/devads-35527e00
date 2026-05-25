import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, Trash2, X } from "lucide-react";

export function BulkActionBar({
  count, onRenew, onSold, onDelete, onClear,
}: {
  count: number;
  onRenew: () => void;
  onSold: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 px-4">
      <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-full border border-white/40 bg-white/85 px-3 py-2 shadow-[var(--shadow-float-lg)] backdrop-blur-2xl">
        <button onClick={onClear} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white" aria-label="Clear selection">
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{count} selected</span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" className="rounded-full bg-white/70" onClick={onRenew}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Renew
          </Button>
          <Button size="sm" variant="outline" className="rounded-full bg-white/70" onClick={onSold}>
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Sold
          </Button>
          <Button size="sm" variant="destructive" className="rounded-full" onClick={onDelete}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
