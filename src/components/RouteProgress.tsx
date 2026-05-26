import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/**
 * Thin gradient top-loading bar that animates while the router is pending.
 */
export function RouteProgress() {
  const isLoading = useRouterState({ select: (s) => s.isLoading || s.isTransitioning });
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf: number | undefined;
    let hideTimer: number | undefined;

    if (isLoading) {
      setVisible(true);
      setProgress(8);
      const tick = () => {
        setProgress((p) => {
          if (p >= 90) return p;
          const inc = p < 30 ? 4 : p < 60 ? 2 : 0.6;
          return p + inc;
        });
        raf = window.requestAnimationFrame(() => {
          hideTimer = window.setTimeout(tick, 180);
        });
      };
      tick();
    } else if (visible) {
      setProgress(100);
      hideTimer = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 260);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (hideTimer) clearTimeout(hideTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      aria-hidden
    >
      <div
        className="h-full origin-left rounded-r-full shadow-[0_0_12px_rgba(124,58,237,0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
          background: "linear-gradient(90deg, hsl(var(--primary)), #a78bfa, hsl(var(--primary)))",
          backgroundSize: "200% 100%",
          animation: "routeProgressShimmer 1.2s linear infinite",
        }}
      />
      <style>{`@keyframes routeProgressShimmer { 0% { background-position: 0% 0; } 100% { background-position: 200% 0; } }`}</style>
    </div>
  );
}
