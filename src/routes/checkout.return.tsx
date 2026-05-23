import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({ meta: [{ title: "Payment received — Marketly" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <div className="iridescent-border rounded-3xl border border-white/40 bg-white/65 p-10 text-center shadow-[var(--shadow-float-lg)] backdrop-blur-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full btn-gradient text-white">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Payment <span className="gradient-text">received</span></h1>
        <p className="mt-2 text-muted-foreground">
          {session_id
            ? "Your promotion is being activated. It will appear within a few seconds."
            : "No session information found."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild className="btn-gradient rounded-full border-0"><Link to="/">Back to home</Link></Button>
          <Button asChild variant="outline" className="rounded-full bg-white/60 backdrop-blur"><Link to="/search">Browse listings</Link></Button>
        </div>
      </div>
    </div>
  );
}
