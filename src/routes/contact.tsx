import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageSquare, ShieldAlert, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — CallEscort24" },
      { name: "description", content: "Get in touch with the CallEscort24 team for support, trust & safety, partnerships or press inquiries." },
      { property: "og:title", content: "Contact — CallEscort24" },
      { property: "og:description", content: "Reach the CallEscort24 team." },
      { property: "og:url", content: "https://devads.lovable.app/contact" },
    ],
    links: [{ rel: "canonical", href: "https://devads.lovable.app/contact" }],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().min(3, "Subject is too short").max(150),
  message: z.string().trim().min(10, "Message is too short").max(2000),
});

const channels = [
  { icon: Mail, title: "General", body: "Product questions, feedback, or anything else.", email: "support@callescort24.com" },
  { icon: ShieldAlert, title: "Trust & Safety", body: "Report scams, abuse or policy violations.", email: "support@callescort24.com" },
  { icon: MessageSquare, title: "Press & Partnerships", body: "Media, business development and partnerships.", email: "support@callescort24.com" },
];

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<null | { name: string; email: string }>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof typeof form, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof form;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setErrors({});
    setSubmitting(true);
    // No backend mailer wired — open the user's email client as a graceful fallback.
    const body = encodeURIComponent(
      `${parsed.data.message}\n\n— ${parsed.data.name} <${parsed.data.email}>`
    );
    const subject = encodeURIComponent(parsed.data.subject);
    window.location.href = `mailto:support@callescort24.com?subject=${subject}&body=${body}`;
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted({ name: parsed.data.name, email: parsed.data.email });
      toast.success("Your message is ready in your email client.");
    }, 300);
  }

  function resetForm() {
    setForm({ name: "", email: "", subject: "", message: "" });
    setErrors({});
    setSubmitted(null);
  }


  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <header className="text-center">
        <h1 className="font-display text-4xl font-bold md:text-5xl">
          Get in <span className="gradient-text">touch</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          We typically reply within one business day. Pick the right channel below or send us a note.
        </p>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {channels.map((c) => (
          <a
            key={c.title}
            href={`mailto:${c.email}`}
            className="iridescent-border group rounded-3xl border border-white/40 bg-white/65 p-6 shadow-[var(--shadow-float)] backdrop-blur-xl transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/5"
          >
            <div
              className="mb-3 grid h-10 w-10 place-items-center rounded-xl text-white shadow-md"
              style={{ background: "var(--gradient-primary)" }}
            >
              <c.icon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-bold">{c.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
            <div className="mt-3 text-sm font-medium text-primary group-hover:underline">{c.email}</div>
          </a>
        ))}
      </section>

      <section className="mt-10 rounded-3xl border border-white/40 bg-white/65 p-6 backdrop-blur-xl shadow-[var(--shadow-float)] md:p-10 dark:border-white/10 dark:bg-white/5">
        {submitted ? (
          <div className="grid place-items-center py-6 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl font-bold">Message ready to send</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Thanks {submitted.name}! We've opened your email client with the message pre-filled. Please
              confirm the send — we'll reply to <span className="font-medium">{submitted.email}</span> within
              one business day.
            </p>
            <Button
              onClick={resetForm}
              variant="outline"
              className="mt-6 rounded-full bg-white/70"
            >
              Send another message
            </Button>
          </div>
        ) : (
          <>
            <h2 className="font-display text-2xl font-bold">Send us a message</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll do our best to reply within one business day.
            </p>
            <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  className="mt-1 bg-white/70"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={100}
                  aria-invalid={!!errors.name}
                  required
                />
                {errors.name && <p role="alert" className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  className="mt-1 bg-white/70"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={255}
                  aria-invalid={!!errors.email}
                  required
                />
                {errors.email && <p role="alert" className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  className="mt-1 bg-white/70"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  maxLength={150}
                  aria-invalid={!!errors.subject}
                  required
                />
                {errors.subject && <p role="alert" className="mt-1 text-xs text-destructive">{errors.subject}</p>}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  className="mt-1 bg-white/70"
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  maxLength={2000}
                  aria-invalid={!!errors.message}
                  required
                />
                {errors.message && <p role="alert" className="mt-1 text-xs text-destructive">{errors.message}</p>}
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="btn-gradient rounded-full border-0 px-6"
                >
                  {submitting ? "Opening…" : "Send message"}
                </Button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
