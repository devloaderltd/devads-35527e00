export function TypingBubble({ name }: { name?: string }) {
  return (
    <div className="flex items-end gap-2 px-1 py-1" aria-label={`${name ?? "User"} is typing`}>
      <div className="rounded-2xl bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
