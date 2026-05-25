import { type ReactNode } from "react";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          {title.split(" ").slice(0, -1).join(" ")}{" "}
          <span className="gradient-text">{title.split(" ").slice(-1)}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
      </header>
      <article className="prose prose-neutral max-w-none rounded-3xl border border-white/40 bg-white/65 p-6 shadow-[var(--shadow-float)] backdrop-blur-xl dark:prose-invert dark:border-white/10 dark:bg-white/5 md:p-10
        [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3
        [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2
        [&_p]:my-3 [&_p]:leading-relaxed
        [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1
        [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline">
        {children}
      </article>
    </div>
  );
}
