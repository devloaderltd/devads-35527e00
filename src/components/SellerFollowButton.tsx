import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Heart, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  toggleFollowSeller,
  getSellerFollowState,
  getMyFollowingForSeller,
} from "@/lib/social.functions";
import { toast } from "sonner";

export function SellerFollowButton({ sellerId }: { sellerId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const stateFn = useServerFn(getSellerFollowState);
  const meFn = useServerFn(getMyFollowingForSeller);
  const toggleFn = useServerFn(toggleFollowSeller);

  const stateQ = useQuery({
    queryKey: ["seller-follow-state", sellerId],
    queryFn: () => stateFn({ data: { sellerId } }),
  });
  const meQ = useQuery({
    queryKey: ["seller-follow-mine", sellerId, user?.id],
    queryFn: () => meFn({ data: { sellerId } }),
    enabled: !!user && user.id !== sellerId,
  });

  const m = useMutation({
    mutationFn: () => toggleFn({ data: { sellerId } }),
    onSuccess: (r) => {
      toast.success(r.following ? "Following" : "Unfollowed");
      qc.invalidateQueries({ queryKey: ["seller-follow-state", sellerId] });
      qc.invalidateQueries({ queryKey: ["seller-follow-mine", sellerId, user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (user?.id === sellerId) return null;

  const following = meQ.data?.following ?? false;
  const count = stateQ.data?.followerCount ?? 0;

  return (
    <Button
      size="sm"
      variant={following ? "outline" : "default"}
      className={following ? "rounded-full bg-white/70" : "btn-gradient rounded-full border-0"}
      onClick={() => {
        if (!user) {
          navigate({ to: "/login" });
          return;
        }
        m.mutate();
      }}
      disabled={m.isPending}
    >
      {following ? <UserCheck className="mr-1 h-4 w-4" /> : <Heart className="mr-1 h-4 w-4" />}
      {following ? "Following" : "Follow"}
      {count > 0 && <span className="ml-1.5 text-xs opacity-80">· {count}</span>}
    </Button>
  );
}
