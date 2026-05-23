import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Plus, User as UserIcon, LogOut, Heart, Package, MessageSquare, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: q || undefined } as any });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">M</span>
          <span className="hidden sm:inline">Marketly</span>
        </Link>

        <form onSubmit={onSearch} className="relative ml-2 hidden flex-1 max-w-xl md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search listings, brands, categories…"
            className="pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" className="gap-1">
            <Link to="/post">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Post</span>
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <UserIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/my-listings"><Package className="mr-2 h-4 w-4" /> My listings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/messages"><MessageSquare className="mr-2 h-4 w-4" /> Messages</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/favorites"><Heart className="mr-2 h-4 w-4" /> Favorites</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin"><ShieldCheck className="mr-2 h-4 w-4" /> Moderation</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={onSearch} className="relative border-t bg-background px-4 py-2 md:hidden">
        <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search listings…"
          className="pl-9"
        />
      </form>
    </header>
  );
}
