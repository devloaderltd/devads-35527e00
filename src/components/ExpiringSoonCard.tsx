import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlarmClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export function ExpiringSoonCard({ userId }: { userId: string | undefined }) {
  const { data } = useQuery({
    queryKey: ["expiring-soon", userId],
    enabled: !!userId,
    queryFn: async () => {
      const cutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("listings")
        .select("id, slug, title, expires_at, status")
        .eq("user_id", userId!)
        .eq("status", "active")
        .lt("expires_at", cutoff)
        .order("expires_at", { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  if (!data || data.length === 0) return null;

  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlarmClock className="h-4 w-4 text-amber-500" />
          Expiring soon
          <Badge variant="secondary" className="ml-auto">{data.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y divide-border/40">
          {data.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
              <Link to="/listings/$id" params={{ id: (l as any).slug ?? l.id }} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary">
                {l.title}
              </Link>
              <span className="shrink-0 text-xs text-amber-600 dark:text-amber-400">
                {formatDistanceToNow(new Date(l.expires_at), { addSuffix: true })}
              </span>
            </li>
          ))}
        </ul>
        <Link to="/my-listings" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
          Manage in My Listings →
        </Link>
      </CardContent>
    </Card>
  );
}
