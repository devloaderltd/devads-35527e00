import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import type { Database } from "@/integrations/supabase/types";

type CountryCode = Database["public"]["Enums"]["country_code"];

export const Route = createFileRoute("/admin/cities")({ component: CitiesPage });

function CitiesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [region, setRegion] = useState(""); const [slug, setSlug] = useState(""); const [country, setCountry] = useState("US");
  const { data } = useQuery({ queryKey: ["admin-cities"], queryFn: async () => (await supabase.from("cities").select("*").order("country").order("name")).data ?? [] });

  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("cities").insert({ name, region, slug, country: country as CountryCode }); if (error) throw error; },
    onSuccess: () => { toast.success("Added"); setName(""); setRegion(""); setSlug(""); qc.invalidateQueries({ queryKey: ["admin-cities"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("cities").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-cities"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader title="Cities" subtitle={`${data?.length ?? 0} cities`} />
      <Panel title="Add city">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-[12rem] rounded-full border-white/10 bg-white/5 text-slate-100" />
          <Input placeholder="Region" value={region} onChange={(e) => setRegion(e.target.value)} className="max-w-[12rem] rounded-full border-white/10 bg-white/5 text-slate-100" />
          <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="max-w-[12rem] rounded-full border-white/10 bg-white/5 text-slate-100" />
          <Input placeholder="Country (US)" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} className="max-w-[6rem] rounded-full border-white/10 bg-white/5 text-slate-100" />
          <Button onClick={() => add.mutate()} disabled={!name || !slug || !region} className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white">Add</Button>
        </div>
      </Panel>
      <div className="mt-4">
        <Panel>
          <div className="space-y-2">
            {data?.map(c => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-100">{c.name}, {c.region}</div>
                  <div className="text-xs text-slate-400">{c.country} · {c.slug}</div>
                </div>
                <Button size="sm" variant="destructive" className="rounded-full" onClick={() => { if (confirm(`Delete ${c.name}?`)) del.mutate(c.id); }}>Delete</Button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
