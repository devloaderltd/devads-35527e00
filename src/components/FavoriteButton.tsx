import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  listingId,
  variant = "card",
  showLabel = false,
}: {
  listingId: string;
  variant?: "card" | "inline";
  showLabel?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: isFav } = useQuery({
    queryKey: ["fav", listingId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("listing_id", listingId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const m = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth");
      if (isFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("listing_id", listingId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ listing_id: listingId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fav", listingId] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: (e: any) => {
      if (e.message === "auth") return;
      toast.error(e.message);
    },
  });

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    m.mutate();
  };

  const base =
    variant === "card"
      ? "absolute left-2 bottom-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/80 backdrop-blur shadow-md hover:bg-white transition"
      : "inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-2 text-sm backdrop-blur hover:bg-white transition";

  return (
    <button
      type="button"
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      onClick={onClick}
      className={base}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition",
          isFav ? "fill-rose-500 text-rose-500" : "text-foreground/70",
        )}
      />
      {showLabel && (
        <span className="font-medium">{isFav ? "Saved" : "Save"}</span>
      )}
    </button>
  );
}
