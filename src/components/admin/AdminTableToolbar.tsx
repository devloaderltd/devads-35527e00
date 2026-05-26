import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Option = { value: string; label: string };

type Props = {
  q?: string;
  onQ?: (v: string) => void;
  placeholder?: string;
  filters?: { value: string; onChange: (v: string) => void; options: Option[]; label?: string }[];
  pageSize?: number;
  onPageSize?: (n: number) => void;
  total?: number;
  onExportCsv?: () => void;
  rightSlot?: React.ReactNode;
};

export function AdminTableToolbar({ q, onQ, placeholder = "Search…", filters = [], pageSize, onPageSize, total, onExportCsv, rightSlot }: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2 backdrop-blur sm:px-3">
      {typeof q === "string" && (
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            value={q}
            onChange={(e) => onQ?.(e.target.value)}
            placeholder={placeholder}
            className="h-8 border-white/10 bg-slate-950/50 pl-7 pr-7 text-sm text-slate-100 placeholder:text-slate-500"
          />
          {q && (
            <button
              type="button"
              onClick={() => onQ?.("")}
              className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-slate-500 hover:bg-white/10 hover:text-slate-200"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {filters.map((f, i) => (
        <Select key={i} value={f.value} onValueChange={f.onChange}>
          <SelectTrigger className="h-8 min-w-[7rem] border-white/10 bg-slate-950/50 text-xs text-slate-100">
            <SelectValue placeholder={f.label} />
          </SelectTrigger>
          <SelectContent>
            {f.options.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
          </SelectContent>
        </Select>
      ))}

      <div className="ml-auto flex items-center gap-2">
        {typeof total === "number" && (
          <span className="hidden text-xs text-slate-400 sm:inline">{total.toLocaleString()} rows</span>
        )}
        {typeof pageSize === "number" && onPageSize && (
          <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-[5rem] border-white/10 bg-slate-950/50 text-xs text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map((n) => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}
            </SelectContent>
          </Select>
        )}
        {onExportCsv && (
          <Button
            type="button"
            onClick={onExportCsv}
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-white/15 bg-white/5 text-xs text-slate-100 hover:bg-white/10"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
        )}
        {rightSlot}
      </div>
    </div>
  );
}

export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  if (!rows.length) return "";
  const cols = headers ?? Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
