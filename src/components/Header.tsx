import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Plus, User as UserIcon, LogOut, Heart, Package, MessageSquare, ShieldCheck, MapPin, LayoutDashboard, Bug } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useCity } from "@/lib/city-context";
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
  const { cityName, openPicker } = useCity();
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
    <header className="sticky top-3 z-40 mx-3 mt-3 md:mx-6">
      <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-2xl glass-strong px-3 py-2.5">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl btn-gradient text-white shadow-inner">M</span>
          <span className="hidden sm:inline">Marketly</span>
        </Link>

        <form onSubmit={onSearch} className="relative ml-2 hidden flex-1 max-w-md md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search listings…"
            className="rounded-full border-white/60 bg-white/60 pl-9 focus-visible:bg-white"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openPicker}
            className="hidden sm:inline-flex rounded-full bg-white/60 backdrop-blur gap-1 max-w-[12rem]"
            title="Change city"
          >
            <MapPin className="h-4 w-4 text-primary" />
            <span className="truncate">{cityName ?? "Select city"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={openPicker}
            className="sm:hidden rounded-full bg-white/60 backdrop-blur"
            title={cityName ?? "Select city"}
          >
            <MapPin className="h-4 w-4 text-primary" />
          </Button>
          <ThemeToggle />
          <Button asChild size="sm" className="btn-gradient gap-1 rounded-full border-0">
            <Link to="/post">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Post</span>
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full bg-white/60 backdrop-blur">
                  <UserIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile"><UserIcon className="mr-2 h-4 w-4" /> Profile</Link>
                </DropdownMenuItem>
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
                <DropdownMenuItem asChild>
                  <Link to="/debug/session"><Bug className="mr-2 h-4 w-4" /> Debug session</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm" className="rounded-full bg-white/60 backdrop-blur">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={onSearch} className="relative mx-auto mt-2 max-w-6xl md:hidden">
        <div className="rounded-2xl glass px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search listings…"
              className="rounded-full border-white/60 bg-white/70 pl-9"
            />
          </div>
        </div>
      </form>
    </header>
  );
}
