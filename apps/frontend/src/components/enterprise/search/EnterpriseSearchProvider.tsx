"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Building2, Settings, LifeBuoy, Star, Clock } from "lucide-react";
import { getItemByHref, describeRoute } from "@/lib/navigation";
import { switchBusiness } from "@/app/actions/business";
import { fuzzyBest } from "./lib/fuzzy-search";
import { runSearch, groupResults, type SearchItem, type SearchSource } from "./lib/search";
import { navigationSource, calculatorSource, permittedQuickActions } from "./lib/search-index";
import { entitySources, ENTITY_GROUP_ORDER } from "./lib/entity-sources";

const FAV_KEY = "octien:favorites"; // shared with the sidebar (one store)
const RECENT_KEY = "octien:recent";

export const SECTION_ORDER = ["Calculator", "Favorites", "Recent", "Create", "Navigation", "Workspace", "Theme", "Application"];

interface SearchContextValue {
  /** Command palette (⌘K — actions). */
  open: boolean;
  setOpen: (v: boolean) => void;
  query: string;
  setQuery: (q: string) => void;
  groups: { group: string; items: SearchItem[] }[];
  select: (item: SearchItem) => void;
  busy: boolean;
  /** Global search (/ — entities). Shares the platform; different sources + surface. */
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  /** Source set for the global-search surface (navigation + entities + calculator). */
  searchSources: SearchSource[];
  searchOrder: string[];
  permissions: string[];
}

const Ctx = createContext<SearchContextValue | null>(null);

export function useEnterpriseSearch(): SearchContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEnterpriseSearch must be used within EnterpriseSearchProvider");
  return v;
}

interface ProviderProps {
  permissions: string[];
  businesses: { id: string; name: string; slug: string }[];
  currentBusinessId?: string;
  children: React.ReactNode;
}

/**
 * Enterprise Search Platform provider. Assembles every SOURCE (navigation, calculator, quick-action
 * create, theme, business switch, navigate, recent, favorites), runs the ONE `search`, and owns the
 * ⌘K palette open-state. All surfaces (command palette, global search, future AI) consume this.
 */
export function EnterpriseSearchProvider({ permissions, businesses, currentBusinessId, children }: ProviderProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<{ group: string; items: SearchItem[] }[]>([]);
  const [busy, setBusy] = useState(false);

  // Global-search sources: navigation + calculator + entity sources (async/DB-ready). No command
  // actions here — the palette owns those. Adding a live source is the only change to go live.
  const searchSources = useMemo<SearchSource[]>(() => [calculatorSource(), navigationSource(), ...entitySources()], []);

  // Runtime-dependent sources (closures capture router/theme/business). Rebuilt only when deps change.
  const sources = useMemo<SearchSource[]>(() => {
    const nav = navigationSource();
    const calc = calculatorSource();

    const commands: SearchSource = ({ query: q }) => {
      const defs: SearchItem[] = [];
      // Create (quick actions)
      for (const a of permittedQuickActions(permissions)) {
        defs.push({ id: `create:${a.id}`, type: "action", title: `New ${a.title}`, icon: a.icon, group: "Create", keywords: a.keywords, href: a.href });
      }
      // Theme
      defs.push(
        { id: "theme:light", type: "command", title: "Light theme", icon: Sun, group: "Theme", keywords: ["light", "theme", "appearance"], run: () => setTheme("light") },
        { id: "theme:dark", type: "command", title: "Dark theme", icon: Moon, group: "Theme", keywords: ["dark", "theme", "appearance"], run: () => setTheme("dark") },
        { id: "theme:system", type: "command", title: "System theme", icon: Monitor, group: "Theme", keywords: ["system", "theme", "auto"], run: () => setTheme("system") },
      );
      // Workspace switch
      for (const b of businesses) {
        if (b.id === currentBusinessId) continue;
        defs.push({
          id: `biz:${b.id}`,
          type: "command",
          title: `Switch to ${b.name}`,
          icon: Building2,
          group: "Workspace",
          keywords: ["workspace", "business", "switch", b.name],
          run: () => startTransition(async () => { try { await switchBusiness(b.id); } catch { /* ignore */ } }),
        });
      }
      // Application
      defs.push(
        { id: "app:settings", type: "command", title: "Settings", icon: Settings, group: "Application", keywords: ["preferences", "config"], href: "/settings" },
        { id: "app:help", type: "command", title: "Help & documentation", icon: LifeBuoy, group: "Application", keywords: ["docs", "support"], href: "/help" },
      );
      // Score by query (or a base score so commands show when browsing).
      return defs
        .map((d) => ({ ...d, score: q ? fuzzyBest(q, [d.title, d.group, ...(d.keywords ?? [])]) : 20 }))
        .filter((d) => (d.score ?? 0) > 0);
    };

    const recent: SearchSource = ({ query: q }) => {
      let hrefs: string[] = [];
      try {
        hrefs = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
      } catch {
        /* ignore */
      }
      return hrefs.slice(0, 6).map((href, i) => {
        const d = describeRoute(href);
        const base = q ? fuzzyBest(q, [d.label, href]) : 90 - i; // recent ranks high when browsing
        return { id: `recent:${href}`, type: "recent" as const, title: d.label, subtitle: href, icon: d.icon ?? Clock, group: "Recent", href, score: base };
      }).filter((d) => (d.score ?? 0) > 0);
    };

    const favorites: SearchSource = ({ query: q }) => {
      let hrefs: string[] = [];
      try {
        hrefs = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]");
      } catch {
        /* ignore */
      }
      const out: SearchItem[] = [];
      for (const href of hrefs) {
        const item = getItemByHref(href);
        if (!item) continue;
        const score = q ? fuzzyBest(q, [item.label, ...(item.keywords ?? [])]) : 95;
        if (score <= 0) continue;
        out.push({ id: `fav:${href}`, type: "favorite", title: item.label, icon: item.icon ?? Star, group: "Favorites", href, score });
      }
      return out;
    };

    return [calc, favorites, recent, commands, nav];
  }, [permissions, businesses, currentBusinessId, setTheme]);

  // Run the unified search whenever the query changes (or the palette opens).
  const reqId = useRef(0);
  useEffect(() => {
    if (!open) return;
    const id = ++reqId.current;
    // Kick off the async unified search when the query/open changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusy(true);
    runSearch(sources, { query, permissions }).then((items) => {
      if (id !== reqId.current) return; // stale
      setGroups(groupResults(items, SECTION_ORDER));
      setBusy(false);
    });
  }, [query, open, sources, permissions]);

  // ⌘K / Ctrl+K toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      // ⌘K / Ctrl+K → command palette (actions)
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      // "/" → global search (entities), when not typing in a field
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const select = useCallback(
    (item: SearchItem) => {
      setOpen(false);
      setQuery("");
      if (item.run) {
        void item.run();
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [router],
  );

  const value = useMemo<SearchContextValue>(
    () => ({ open, setOpen, query, setQuery, groups, select, busy, searchOpen, setSearchOpen, searchSources, searchOrder: ENTITY_GROUP_ORDER, permissions }),
    [open, query, groups, select, busy, searchOpen, searchSources, permissions],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
