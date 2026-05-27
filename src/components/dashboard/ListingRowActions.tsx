import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TrendingUp, Pause, Play, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PromoteDialog } from "@/components/PromoteDialog";

export function ListingRowActions({ listing, onChange }: { listing: { id: string; slug?: string; status: string }; onChange?: () => void }) {
  const qc = useQueryClient();


  const toggleStatus = useMutation({
    mutationFn: async () => {
      const next = listing.status === "active" ? "draft" : "active";
      const { error } = await supabase.from("listings").update({ status: next as "active" | "draft" }).eq("id", listing.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); onChange?.(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("listings").delete().eq("id", listing.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Listing deleted"); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); onChange?.(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const isActive = listing.status === "active";

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => bump.mutate()} disabled={bump.isPending} title="Bump to top">
        <TrendingUp className="h-3.5 w-3.5" />
      </Button>
      <span title="Promote">
        <PromoteDialog listingId={listing.id} />
      </span>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => toggleStatus.mutate()} disabled={toggleStatus.isPending} title={isActive ? "Pause" : "Activate"}>
        {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <Button asChild size="sm" variant="ghost" className="h-7 px-2" title="View">
        <Link to="/listings/$id" params={{ id: listing.slug ?? listing.id }}><Pencil className="h-3.5 w-3.5" /></Link>
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-600 hover:text-rose-700" onClick={() => { if (confirm("Delete this listing?")) del.mutate(); }} disabled={del.isPending} title="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

