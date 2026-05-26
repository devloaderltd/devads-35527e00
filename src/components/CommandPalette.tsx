import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Plus,
  LayoutDashboard,
  Package,
  MessageSquare,
  Heart,
  Wallet,
  BookmarkCheck,
  User as UserIcon,
  Search as SearchIcon,
  Home,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (fn: () => void) => {
    setOpen(false);
    setTimeout(fn, 0);
  };

  const recent: string[] =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("recent_searches") || "[]").slice(0, 5)
      : [];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search the site or jump to a page…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go(() => navigate({ to: "/" }))}>
            <Home className="mr-2 h-4 w-4" /> Home
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/search" }))}>
            <SearchIcon className="mr-2 h-4 w-4" /> Browse marketplace
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/post" }))}>
            <Plus className="mr-2 h-4 w-4" /> Post a listing
          </CommandItem>
        </CommandGroup>
        {user && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Your account">
              <CommandItem onSelect={() => go(() => navigate({ to: "/dashboard" }))}>
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </CommandItem>
              <CommandItem onSelect={() => go(() => navigate({ to: "/my-listings" }))}>
                <Package className="mr-2 h-4 w-4" /> My listings
              </CommandItem>
              <CommandItem onSelect={() => go(() => navigate({ to: "/messages" }))}>
                <MessageSquare className="mr-2 h-4 w-4" /> Messages
              </CommandItem>
              <CommandItem onSelect={() => go(() => navigate({ to: "/favorites" }))}>
                <Heart className="mr-2 h-4 w-4" /> Favorites
              </CommandItem>
              <CommandItem onSelect={() => go(() => navigate({ to: "/saved-searches" }))}>
                <BookmarkCheck className="mr-2 h-4 w-4" /> Saved searches
              </CommandItem>
              <CommandItem onSelect={() => go(() => navigate({ to: "/wallet" }))}>
                <Wallet className="mr-2 h-4 w-4" /> Wallet
              </CommandItem>
              <CommandItem onSelect={() => go(() => navigate({ to: "/profile" }))}>
                <UserIcon className="mr-2 h-4 w-4" /> Profile
              </CommandItem>
            </CommandGroup>
          </>
        )}
        {recent.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent searches">
              {recent.map((q) => (
                <CommandItem
                  key={q}
                  onSelect={() => go(() => navigate({ to: "/search", search: { q } as any }))}
                >
                  <SearchIcon className="mr-2 h-4 w-4 text-muted-foreground" /> {q}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
