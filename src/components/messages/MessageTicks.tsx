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
  return (
    <span title={title} className="inline-flex">
      {state === "sent" ? (
        <Check className="h-3 w-3 text-white/70" />
      ) : (
        <CheckCheck className={`h-3 w-3 ${state === "seen" ? "text-white" : "text-white/70"}`} />
      )}
    </span>
  );
}
