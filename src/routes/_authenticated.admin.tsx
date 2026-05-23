import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Moderation — Marketly" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: roles } = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      return data?.map((r) => r.role) ?? [];
    },
  });

  const isMod = roles?.includes("admin") || roles?.includes("moderator");

  const { data: reports } = useQuery({
    queryKey: ["reports"],
    enabled: !!isMod,
    queryFn: async () => {
      const { data: rs } = await supabase
        .from("reports")
        .select("id, listing_id, reporter_id, reason, details, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!rs) return [];
      const listingIds = [...new Set(rs.map((r) => r.listing_id))];
      const { data: listings } = await supabase
        .from("listings").select("id, title, status, user_id").in("id", listingIds);
      return rs.map((r) => ({ ...r, listing: listings?.find((l) => l.id === r.listing_id) }));
    },
  });

  const resolveReport = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "resolved" | "dismissed" }) => {
      const { error } = await supabase.from("reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); toast.success("Report updated"); },
  });

  const removeListing = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase.from("listings").update({ status: "removed" }).eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); toast.success("Listing removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (roles === undefined) return <div className="container mx-auto px-4 py-10 text-muted-foreground">Loading…</div>;
  if (!isMod) {
    return (
      <div className="container mx-auto grid place-items-center px-4 py-20 text-center">
        <ShieldAlert className="mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-xl font-bold">Moderators only</h1>
        <p className="mt-1 text-sm text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-4 font-display text-2xl font-bold"><span className="gradient-text">Moderation</span></h1>
      <div className="space-y-3">
        {reports?.length === 0 && (
          <div className="rounded-2xl glass p-10 text-center text-sm text-muted-foreground">No reports.</div>
        )}
        {reports?.map((r) => (
          <div key={r.id} className="rounded-2xl glass p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "open" ? "default" : "secondary"} className="capitalize">{r.status}</Badge>
                  <span className="text-sm font-medium">{r.reason}</span>
                </div>
                {r.listing ? (
                  <Link to="/listings/$id" params={{ id: r.listing.id }} className="mt-1 block text-sm text-primary hover:underline">
                    {r.listing.title}
                  </Link>
                ) : <span className="text-sm text-muted-foreground">Listing deleted</span>}
                {r.details && <p className="mt-2 max-w-xl whitespace-pre-wrap text-sm text-muted-foreground">{r.details}</p>}
                <div className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.listing && r.listing.status !== "removed" && (
                  <Button size="sm" variant="destructive" className="rounded-full" onClick={() => removeListing.mutate(r.listing!.id)}>
                    Remove listing
                  </Button>
                )}
                {r.status === "open" && (
                  <>
                    <Button size="sm" variant="outline" className="rounded-full bg-white/60 backdrop-blur" onClick={() => resolveReport.mutate({ id: r.id, status: "dismissed" })}>
                      Dismiss
                    </Button>
                    <Button size="sm" className="btn-gradient rounded-full border-0" onClick={() => resolveReport.mutate({ id: r.id, status: "resolved" })}>
                      Resolve
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
