import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [slug, setSlug] = useState("");
  const { data } = useQuery({ queryKey: ["admin-categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order").order("name")).data ?? [] });

  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("categories").insert({ name, slug }); if (error) throw error; },
    onSuccess: () => { toast.success("Added"); setName(""); setSlug(""); qc.invalidateQueries({ queryKey: ["admin-categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("categories").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader title="Categories" subtitle={`${data?.length ?? 0} categories`} />
      <Panel title="Add category">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs rounded-full border-white/10 bg-white/5 text-slate-100" />
          <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="max-w-xs rounded-full border-white/10 bg-white/5 text-slate-100" />
          <Button onClick={() => add.mutate()} disabled={!name || !slug} className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white">Add</Button>
        </div>
      </Panel>
      <div className="mt-4">
        <Panel>
          <div className="space-y-2">
            {data?.map(c => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-100">{c.name}</div>
                  <div className="text-xs text-slate-400">{c.slug}</div>
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
