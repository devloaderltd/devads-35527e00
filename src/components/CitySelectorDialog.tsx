import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useCity } from "@/lib/city-context";

type City = { id: string; name: string; region: string; country: string };

export function CitySelectorDialog({ dismissable }: { dismissable: boolean }) {
  const { cityId, hydrated, pickerOpen, closePicker, setCity } = useCity();
  const [q, setQ] = useState("");

  // Show when explicitly opened, OR when first-time visitor (hydrated & no city)
  const open = pickerOpen || (hydrated && !cityId);
  const allowDismiss = dismissable && !!cityId;

  const { data: cities, isLoading } = useQuery({
    queryKey: ["cities", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("id, name, region, country")
        .order("country")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as City[];
    },
    enabled: open,
  });

  const filtered = useMemo(() => {
    if (!cities) return [];
    const s = q.trim().toLowerCase();
    if (!s) return cities;
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.region.toLowerCase().includes(s) ||
        c.country.toLowerCase().includes(s),
    );
  }, [cities, q]);

  const grouped = useMemo(() => {
    const m = new Map<string, City[]>();
    for (const c of filtered) {
      if (!m.has(c.country)) m.set(c.country, []);
      m.get(c.country)!.push(c);
    }
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && allowDismiss) closePicker();
      }}
    >
      <DialogContent
        className="max-w-lg p-0 gap-0 overflow-hidden"
        onInteractOutside={(e) => {
          if (!allowDismiss) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!allowDismiss) e.preventDefault();
        }}
        showCloseButton={allowDismiss}
      >
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <MapPin className="h-5 w-5 text-primary" />
            Choose your city
          </DialogTitle>
          <DialogDescription>
            Listings on the homepage will be shown for the city you select.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search city, region or country…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-2 pb-4">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading cities…</div>}
          {!isLoading && grouped.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No cities match "{q}".</div>
          )}
          {grouped.map(([country, items]) => (
            <div key={country} className="mb-2">
              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {country}
              </div>
              <ul>
                {items.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setCity(c.id, c.name)}
                      className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left hover:bg-accent/40"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.region}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
