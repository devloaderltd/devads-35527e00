import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Ban, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BlockSellerButton({ sellerId }: { sellerId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: blocked } = useQuery({
    queryKey: ["block", user?.id, sellerId],
    enabled: !!user && user.id !== sellerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_blocks")
        .select("blocker_id")
        .eq("blocker_id", user!.id)
        .eq("blocked_id", sellerId)
        .maybeSingle();
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (blocked) {
        const { error } = await supabase
          .from("user_blocks")
          .delete()
          .eq("blocker_id", user.id)
          .eq("blocked_id", sellerId);
        if (error) throw error;
        return false;
      } else {
        const { error } = await supabase
          .from("user_blocks")
          .insert({ blocker_id: user.id, blocked_id: sellerId });
        if (error) throw error;
        return true;
      }
    },
    onSuccess: (nowBlocked) => {
      qc.invalidateQueries({ queryKey: ["block", user?.id, sellerId] });
      toast.success(nowBlocked ? "Seller blocked" : "Seller unblocked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user || user.id === sellerId) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      className="gap-1.5 rounded-full text-xs text-muted-foreground hover:text-rose-600"
    >
      {blocked ? <><Undo2 className="h-3.5 w-3.5" /> Unblock seller</> : <><Ban className="h-3.5 w-3.5" /> Block seller</>}
    </Button>
  );
}
