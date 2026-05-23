import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  return (
    <div className="container mx-auto max-w-md px-4 py-16 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
      <h1 className="mt-4 font-display text-2xl font-bold">Payment received</h1>
      <p className="mt-2 text-muted-foreground">
        {session_id
          ? "Your promotion is being activated. It will appear within a few seconds."
          : "No session information found."}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button asChild><Link to="/">Back to home</Link></Button>
        <Button asChild variant="outline"><Link to="/search">Browse listings</Link></Button>
      </div>
    </div>
  );
}
