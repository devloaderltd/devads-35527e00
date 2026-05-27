import { Toaster as Sonner } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      duration={3500}
      visibleToasts={4}
      expand
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-emerald-400" strokeWidth={2.25} />,
        error: <XCircle className="h-5 w-5 text-rose-400" strokeWidth={2.25} />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-400" strokeWidth={2.25} />,
        info: <Info className="h-5 w-5 text-sky-400" strokeWidth={2.25} />,
        loading: <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" strokeWidth={2.25} />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: [
            "group toast pointer-events-auto relative flex w-full items-start gap-3",
            "rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur-xl",
            "px-4 py-3.5 pr-10 text-slate-100",
            "shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)_inset]",
            "before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[3px] before:rounded-full",
            "before:bg-gradient-to-b before:from-indigo-400 before:to-fuchsia-500",
            "data-[type=success]:before:from-emerald-400 data-[type=success]:before:to-teal-500",
            "data-[type=error]:before:from-rose-400 data-[type=error]:before:to-red-500",
            "data-[type=warning]:before:from-amber-400 data-[type=warning]:before:to-orange-500",
            "data-[type=info]:before:from-sky-400 data-[type=info]:before:to-blue-500",
            "data-[type=loading]:before:from-indigo-400 data-[type=loading]:before:to-fuchsia-500",
          ].join(" "),
          title: "text-[0.95rem] font-semibold leading-snug tracking-tight text-slate-50",
          description: "text-sm leading-snug text-slate-400 mt-0.5",
          icon: "flex items-center justify-center shrink-0 mt-0.5",
          actionButton:
            "!bg-gradient-to-r !from-indigo-500 !to-fuchsia-500 !text-white !rounded-lg !px-3 !py-1.5 !text-xs !font-medium hover:!opacity-90 transition-opacity",
          cancelButton:
            "!bg-white/5 !text-slate-300 !rounded-lg !px-3 !py-1.5 !text-xs hover:!bg-white/10 transition-colors",
          closeButton:
            "!absolute !right-2 !top-2 !left-auto !right-2 !bg-white/5 !border-white/10 !text-slate-400 hover:!bg-white/10 hover:!text-slate-100 !transition-colors",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
