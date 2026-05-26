import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, Mail, MessageCircle, Send, Share2, Twitter, Check } from "lucide-react";
import { toast } from "sonner";

export function ShareSheet({
  open,
  onOpenChange,
  url,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string;
  title: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: "#0f172a", light: "#ffffff00" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [open, url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
    } else {
      copy();
    }
  };

  const downloadQr = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `${title.slice(0, 40).replace(/[^a-z0-9]+/gi, "-")}-qr.png`;
    a.click();
  };

  const enc = encodeURIComponent;
  const text = `${title} — ${url}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Share2 className="h-4 w-4" /> Share</DialogTitle>
          <DialogDescription className="truncate">{title}</DialogDescription>
        </DialogHeader>

        {qr && (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-2xl border border-white/40 bg-white p-3 shadow-sm">
              <img src={qr} alt="QR code" width={220} height={220} />
            </div>
            <Button variant="ghost" size="sm" onClick={downloadQr} className="gap-1 text-xs">
              <Download className="h-3.5 w-3.5" /> Download QR
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-full border bg-white/60 px-3 py-2 text-xs dark:bg-slate-900/60">
          <span className="flex-1 truncate text-muted-foreground">{url}</span>
          <Button size="sm" variant="ghost" onClick={copy} className="h-7 gap-1 px-2 text-xs">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <ShareBtn label="Native" icon={<Share2 className="h-4 w-4" />} onClick={nativeShare} />
          <ShareBtn label="WhatsApp" icon={<MessageCircle className="h-4 w-4" />} href={`https://wa.me/?text=${enc(text)}`} />
          <ShareBtn label="Telegram" icon={<Send className="h-4 w-4" />} href={`https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`} />
          <ShareBtn label="X" icon={<Twitter className="h-4 w-4" />} href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`} />
          <ShareBtn label="Email" icon={<Mail className="h-4 w-4" />} href={`mailto:?subject=${enc(title)}&body=${enc(text)}`} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareBtn({
  label,
  icon,
  href,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const cls =
    "flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-white/40 bg-white/70 text-[11px] font-medium transition hover:bg-white hover:shadow-sm dark:bg-slate-900/60 dark:hover:bg-slate-900";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {icon}
        {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {icon}
      {label}
    </button>
  );
}
