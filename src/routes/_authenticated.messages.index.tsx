import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/messages/")({
  component: () => (
    <div className="grid h-full place-items-center p-10 text-sm text-muted-foreground">
      Select a conversation to start reading.
    </div>
  ),
});
