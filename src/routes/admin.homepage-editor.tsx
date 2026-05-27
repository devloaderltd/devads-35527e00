import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink } from "lucide-react";
import {
  getHomepageConfig,
  saveHomepageConfig,
  DEFAULT_HOMEPAGE_CONFIG,
  type HomepageConfig,
  type BentoTile,
} from "@/lib/homepage-config.functions";

export const Route = createFileRoute("/admin/homepage-editor")({ component: Page });

const SECTION_LABELS: Record<keyof HomepageConfig["sections"], string> = {
  trust_stats: "Trust stats card",
  chip_strip: "Category chip strip",
  city_banner: "City context banner",
  recently_viewed: "Recently viewed rail",
  trending_rail: "Trending in city rail",
  featured_row: "Featured listings row",
  bumped_rail: "Trending now (bumped) rail",
  latest: "Latest listings grid",
};

function Page() {
  const fn = useServerFn(getHomepageConfig);
  const save = useServerFn(saveHomepageConfig);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["homepage-config"], queryFn: () => fn() });
  const cfg = q.data?.config ?? DEFAULT_HOMEPAGE_CONFIG;

  const [hero, setHero] = useState(cfg.hero);
  const [feat, setFeat] = useState(cfg.bento_featured);
  const [t2, setT2] = useState(cfg.bento_tile_2);
  const [t3, setT3] = useState(cfg.bento_tile_3);
  const [t4, setT4] = useState(cfg.bento_tile_4);
  const [sec, setSec] = useState(cfg.sections);

  useEffect(() => {
    if (!q.data) return;
    setHero(q.data.config.hero);
    setFeat(q.data.config.bento_featured);
    setT2(q.data.config.bento_tile_2);
    setT3(q.data.config.bento_tile_3);
    setT4(q.data.config.bento_tile_4);
    setSec(q.data.config.sections);
  }, [q.data]);

  const m = useMutation({
    mutationFn: (input: { section: string; data: unknown }) => save({ data: input as never }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["homepage-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Homepage editor"
        subtitle="Edit hero copy, bento tiles, and toggle which sections appear"
        actions={
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <a href="/" target="_blank" rel="noreferrer">
              Preview <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </a>
          </Button>
        }
      />

      <Panel title="Hero band">
        <div className="space-y-3">
          <Field label="Badge text">
            <Input value={hero.badge} onChange={(e) => setHero({ ...hero, badge: e.target.value })} maxLength={120} className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500" />
          </Field>
          <Field label="Title (use {accent}…{/accent} for the gradient highlight)">
            <Textarea value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} maxLength={240} rows={2} className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500" />
          </Field>
          <Field label="Subtitle">
            <Textarea value={hero.subtitle} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} maxLength={500} rows={3} className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Primary CTA label"><Input value={hero.cta1_label} onChange={(e) => setHero({ ...hero, cta1_label: e.target.value })} maxLength={40} className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500" /></Field>
            <Field label="Primary CTA URL"><Input value={hero.cta1_url} onChange={(e) => setHero({ ...hero, cta1_url: e.target.value })} maxLength={500} className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500" /></Field>
            <Field label="Secondary CTA label"><Input value={hero.cta2_label} onChange={(e) => setHero({ ...hero, cta2_label: e.target.value })} maxLength={40} className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500" /></Field>
            <Field label="Secondary CTA URL"><Input value={hero.cta2_url} onChange={(e) => setHero({ ...hero, cta2_url: e.target.value })} maxLength={500} className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500" /></Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => m.mutate({ section: "hero", data: hero })} disabled={m.isPending} className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500">Save hero</Button>
          </div>
        </div>
      </Panel>

      <Panel title="Bento — featured tile (large)">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-slate-200">Show this tile</Label>
            <Switch checked={feat.enabled} onCheckedChange={(v) => setFeat({ ...feat, enabled: v })} />
          </div>
          <Field label="Pinned listing — paste the listing slug or UUID (leave blank to auto-pick newest featured/active)">
            <Input value={feat.pinned_listing_id ?? ""} onChange={(e) => setFeat({ ...feat, pinned_listing_id: e.target.value.trim() || null })} placeholder="my-listing-slug  or  00000000-0000-0000-0000-000000000000" className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500 font-mono text-xs" />
          </Field>
          <Field label="Badge label"><Input value={feat.badge_label} onChange={(e) => setFeat({ ...feat, badge_label: e.target.value })} maxLength={40} className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500" /></Field>
          <div className="flex justify-end">
            <Button onClick={() => m.mutate({ section: "bento_featured", data: feat })} disabled={m.isPending} className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500">Save featured tile</Button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <TileEditor title="Bento tile 2 (wide)" tile={t2} onChange={setT2} onSave={() => m.mutate({ section: "bento_tile_2", data: t2 })} saving={m.isPending} />
        <TileEditor title="Bento tile 3 (small)" tile={t3} onChange={setT3} onSave={() => m.mutate({ section: "bento_tile_3", data: t3 })} saving={m.isPending} />
        <TileEditor title="Bento tile 4 (small)" tile={t4} onChange={setT4} onSave={() => m.mutate({ section: "bento_tile_4", data: t4 })} saving={m.isPending} />
      </div>

      <Panel title="Section visibility">
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(SECTION_LABELS) as Array<keyof typeof SECTION_LABELS>).map((k) => (
            <div key={k} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <Label className="text-sm text-slate-200">{SECTION_LABELS[k]}</Label>
              <Switch checked={sec[k]} onCheckedChange={(v) => setSec({ ...sec, [k]: v })} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => m.mutate({ section: "sections", data: sec })} disabled={m.isPending} className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500">Save sections</Button>
        </div>
      </Panel>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-slate-400">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function TileEditor({ title, tile, onChange, onSave, saving }: { title: string; tile: BentoTile; onChange: (t: BentoTile) => void; onSave: () => void; saving: boolean }) {
  return (
    <Panel title={title}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-slate-200">Show this tile</Label>
          <Switch checked={tile.enabled} onCheckedChange={(v) => onChange({ ...tile, enabled: v })} />
        </div>
        <Field label="Title"><Input value={tile.title} onChange={(e) => onChange({ ...tile, title: e.target.value })} maxLength={80} className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500" /></Field>
        <Field label="Subtitle"><Input value={tile.subtitle} onChange={(e) => onChange({ ...tile, subtitle: e.target.value })} maxLength={160} className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500" /></Field>
        <Field label="Image URL (optional)"><Input value={tile.image_url} onChange={(e) => onChange({ ...tile, image_url: e.target.value })} maxLength={500} className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500" /></Field>
        <Field label="Link URL"><Input value={tile.link_url} onChange={(e) => onChange({ ...tile, link_url: e.target.value })} maxLength={500} className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500" /></Field>
        <Field label="Gradient">
          <Select value={tile.gradient} onValueChange={(v) => onChange({ ...tile, gradient: v as BentoTile["gradient"] })}>
            <SelectTrigger className="bg-slate-900/50 text-slate-100"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary (indigo→fuchsia)</SelectItem>
              <SelectItem value="lavender">Lavender → indigo</SelectItem>
              <SelectItem value="amber">Amber → coral</SelectItem>
              <SelectItem value="ocean">Ocean (teal → blue)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} size="sm" className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500">Save tile</Button>
        </div>
      </div>
    </Panel>
  );
}
