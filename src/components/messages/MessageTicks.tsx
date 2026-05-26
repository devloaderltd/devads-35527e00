import { Check, CheckCheck } from "lucide-react";

type Props = {
  state: "sent" | "delivered" | "seen";
  seenAt?: string | null;
};

export function MessageTicks({ state, seenAt }: Props) {
  const title =
    state === "seen" && seenAt
      ? `Seen ${new Date(seenAt).toLocaleString()}`
      : state === "delivered"
      ? "Delivered"
      : "Sent";
  if (state === "sent") {
    return <Check className="h-3 w-3 text-white/70" aria-label={title}><title>{title}</title></Check>;
  }
  return (
    <CheckCheck
      className={`h-3 w-3 ${state === "seen" ? "text-white" : "text-white/70"}`}
      aria-label={title}
    >
      <title>{title}</title>
    </CheckCheck>
  );
}
