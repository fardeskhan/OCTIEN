"use client";

import { Command } from "cmdk";
import { Search, CornerDownLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEnterpriseSearch } from "./EnterpriseSearchProvider";
import { EnterpriseCalculatorResult } from "./EnterpriseCalculatorResult";

/**
 * Command Palette — the first UI consumer of the Enterprise Search Platform (⌘K). It renders
 * whatever the platform returns (navigation, create actions, theme, workspace, calculator, recent,
 * favorites, …); it holds NO search logic of its own. cmdk provides list + keyboard UX; ranking and
 * results come from the provider (`shouldFilter={false}`).
 */
export function EnterpriseCommandPalette() {
  const { open, setOpen, query, setQuery, groups, select, busy } = useEnterpriseSearch();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[10vh] max-h-[min(70vh,760px)] w-[calc(100%-2rem)] max-w-[46rem] translate-y-0 gap-0 overflow-hidden rounded-xl p-0 shadow-xl ring-1 ring-foreground/[0.08] sm:max-w-[46rem]">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Search navigation, run actions, switch theme or workspace, and calculate.</DialogDescription>
        <Command shouldFilter={false} loop className="flex flex-col">
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-[1.125rem] shrink-0 text-muted-foreground" aria-hidden="true" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search or type a command…"
              className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
            />
            <kbd className="hidden shrink-0 rounded-md border border-border/70 bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground sm:inline-block">esc</kbd>
          </div>

          <Command.List className="scrollbar-enterprise max-h-[min(60vh,34rem)] min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
            {groups.length === 0 && !busy && (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-muted/40">
                  <Search className="size-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="mt-3.5 text-sm font-medium text-foreground">No results{query ? ` for “${query}”` : ""}</p>
                <p className="mt-1 max-w-[17rem] text-xs leading-relaxed text-muted-foreground">Try a page name, an action like “new invoice”, or a calculation.</p>
              </div>
            )}

            {groups.map((g) => (
              <Command.Group
                key={g.group}
                heading={g.group === "Calculator" ? undefined : g.group}
                className="mb-2 last:mb-0 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {g.group === "Calculator"
                  ? g.items.map((it) => <EnterpriseCalculatorResult key={it.id} item={it} onSelect={select} />)
                  : g.items.map((it) => {
                      const Icon = it.icon;
                      return (
                        <Command.Item
                          key={it.id}
                          value={it.id}
                          onSelect={() => select(it)}
                          className="group flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-foreground transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                        >
                          {Icon && (
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent bg-muted/60 text-muted-foreground transition-colors group-data-[selected=true]:border-border group-data-[selected=true]:bg-background group-data-[selected=true]:text-foreground">
                              <Icon className="size-4" aria-hidden="true" />
                            </span>
                          )}
                          <span className="flex-1 truncate">{it.title}</span>
                          {it.subtitle && <span className="max-w-[42%] shrink-0 truncate text-xs text-muted-foreground">{it.subtitle}</span>}
                          {it.hint && <kbd className="shrink-0 rounded-md border border-border/70 bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">{it.hint}</kbd>}
                          <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" aria-hidden="true" />
                        </Command.Item>
                      );
                    })}
              </Command.Group>
            ))}
          </Command.List>

          <div className="flex items-center gap-3.5 border-t border-border bg-muted/30 px-4 py-2 text-2xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><kbd className="rounded border border-border/70 bg-background px-1 py-0.5">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1.5"><kbd className="rounded border border-border/70 bg-background px-1 py-0.5">↵</kbd> select</span>
            <span className="ml-auto flex items-center gap-1.5"><kbd className="rounded border border-border/70 bg-background px-1 py-0.5">esc</kbd> close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
