import { Flame, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PromoteDialog } from "@/components/PromoteDialog";

type Props = {
  listingId: string;
  bumpedAt: string | null | undefined;
  isOwner: boolean;
  compact?: boolean;
};

// Note: bump payment + bumped_at are atomic (see apply_paid_bump SQL function),
// so there is no "Pending" state — a listing is either Not bumped or Bumped.
export function BumpStatusCard({ listingId, bumpedAt, isOwner, compact }: Props) {
  const bumpedMs = bumpedAt ? new Date(bumpedAt).getTime() : 0;
  const ageMs = bumpedMs ? Date.now() - bumpedMs : Infinity;
  const isActive = bumpedMs > 0 && ageMs < 24 * 60 * 60 * 1000;
  const hoursLeft = isActive ? Math.max(0, Math.ceil((24 * 60 * 60 * 1000 - ageMs) / (60 * 60 * 1000))) : 0;

  if (isActive) {
    return (
      <div
        className={`rounded-xl border border-orange-300/60 bg-gradient-to-r from-orange-50 to-amber-50 ${
          compact ? "p-2" : "p-3"
        } flex items-center gap-2`}
        data-testid="bump-status-active"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-500 text-white">
          <Flame className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1 text-xs">
          <div className="font-semibold text-orange-900">Bumped</div>
          <div className="text-orange-700">
            {formatDistanceToNow(new Date(bumpedAt!), { addSuffix: true })} · {hoursLeft}h remaining
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 ${
        compact ? "p-2" : "p-3"
      }`}
      data-testid="bump-status-inactive"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1 text-xs">
          <div className="font-semibold text-foreground">Not bumped</div>
          <div className="text-muted-foreground">
            {bumpedMs > 0 ? "Last bump expired. Bump again to return to the top." : "Bump to surface this listing at the top of search."}
          </div>
        </div>
        {isOwner && !compact && (
          <div className="shrink-0">
            <PromoteDialog listingId={listingId} />
          </div>
        )}
      </div>
    </div>
  );
}
