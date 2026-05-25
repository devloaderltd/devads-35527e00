const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;
  return (
    <div
      className="w-full border-b border-white/40 px-4 py-2 text-center text-sm font-medium text-white shadow-sm"
      style={{ background: "var(--gradient-warm)", backgroundSize: "200% 200%" }}
    >
      ✨ All payments in the preview are in test mode.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-white/60 underline-offset-2 hover:decoration-white"
      >
        Read more
      </a>
    </div>
  );
}
