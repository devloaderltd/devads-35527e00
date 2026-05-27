import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Plus, User as UserIcon, LogOut, Heart, Package, MessageSquare, MapPin, LayoutDashboard, Bug, Wallet, BookmarkCheck, Star, BadgeCheck, Command as CommandIcon } from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useCity } from "@/lib/city-context";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import logoUrl from "@/assets/logo.png";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSiteSettings } from "@/lib/admin.functions";

export function Header() {
  const { user } = useAuth();
  const { cityName, openPicker } = useCity();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const fetchSettings = useServerFn(getSiteSettings);
  const { data: settingsData } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: () => fetchSettings(),
    staleTime: 60_000,
  });
  const customLogo = (settingsData?.settings as any)?.logo_url as string | undefined;
  const siteName = (settingsData?.settings as any)?.site_name || "CallEscort24";

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term && typeof window !== "undefined") {
      try {
        const prev: string[] = JSON.parse(localStorage.getItem("recent_searches") || "[]");
        const next = [term, ...prev.filter((x) => x !== term)].slice(0, 6);
        localStorage.setItem("recent_searches", JSON.stringify(next));
      } catch {}
    }
    setMobileSearchOpen(false);
    navigate({ to: "/search", search: { q: term || undefined } as any });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-2 z-40 mx-2 mt-2 sm:top-3 sm:mx-3 sm:mt-3 md:mx-6">
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 rounded-2xl glass-strong px-2 py-2 sm:gap-3 sm:px-3 sm:py-2.5">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg font-bold tracking-tight">
          <img src={customLogo || logoUrl} alt={siteName} width={36} height={36} className="h-8 w-8 rounded-xl object-contain sm:h-9 sm:w-9" />
          <span className="hidden sm:inline">{siteName}</span>
        </Link>



        <form onSubmit={onSearch} className="relative ml-2 hidden flex-1 max-w-md md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search listings…"
            className="rounded-full border-white/60 bg-white/60 pl-9 pr-16 focus-visible:bg-white"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-white/60 bg-white/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline-flex">
            <CommandIcon className="h-3 w-3" /> K
          </kbd>
        </form>

        <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden rounded-full bg-white/60 backdrop-blur"
              title="Search"
            >
              <Search className="h-4 w-4 text-primary" />
            </Button>
          </SheetTrigger>
          <SheetContent side="top" className="rounded-b-3xl border-white/40 bg-white/90 backdrop-blur-2xl">
            <SheetHeader>
              <SheetTitle>Search listings</SheetTitle>
            </SheetHeader>
            <form onSubmit={onSearch} className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="What are you looking for?"
                  className="rounded-full border-white/60 bg-white pl-9"
                />
              </div>
              <Button type="submit" size="sm" className="btn-gradient rounded-full border-0">
                Go
              </Button>
            </form>
          </SheetContent>
        </Sheet>


        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
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
            className="sm:hidden h-9 w-9 shrink-0 rounded-full bg-white/60 backdrop-blur"
            title={cityName ?? "Select city"}
          >
            <MapPin className="h-4 w-4 text-primary" />
          </Button>
          <ThemeToggle />
          {user && <NotificationsBell />}
          <Button asChild size="sm" className="btn-gradient gap-1 rounded-full border-0 px-2.5 sm:px-3">
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
                  <Link to="/wallet"><Wallet className="mr-2 h-4 w-4" /> Wallet</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile"><UserIcon className="mr-2 h-4 w-4" /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/verify"><BadgeCheck className="mr-2 h-4 w-4 text-emerald-500" /> Verify identity · +$5</Link>
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
                  <Link to="/saved-searches"><BookmarkCheck className="mr-2 h-4 w-4" /> Saved searches</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/dashboard?tab=reviews"><Star className="mr-2 h-4 w-4 inline" /> My reviews</a>
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

    </header>
  );
}
