"use client";

import { Command } from "cmdk";
import type { SearchItem } from "./lib/search";
import { EnterpriseSearchSection } from "./EnterpriseSearchSection";
import { EnterpriseSearchResult } from "./EnterpriseSearchResult";
import { EnterpriseCalculatorResult } from "./EnterpriseCalculatorResult";

interface Props {
  groups: { group: string; items: SearchItem[] }[];
  query: string;
  onSelect: (item: SearchItem) => void;
  /** Category filter: "All" or a group name. */
  filter?: string;
}

/** Renders grouped, filtered search results as selectable list items (keyboard via cmdk). */
export function EnterpriseSearchResults({ groups, query, onSelect, filter = "All" }: Props) {
  const visible = filter === "All" ? groups : groups.filter((g) => g.group === filter);
  return (
    <>
      {visible.map((g) =>
        g.group === "Calculator" ? (
          g.items.map((item) => <EnterpriseCalculatorResult key={item.id} item={item} onSelect={onSelect} />)
        ) : (
          <EnterpriseSearchSection key={g.group} title={g.group} count={g.items.length}>
            {g.items.map((item) => (
              <Command.Item
                key={item.id}
                value={item.id}
                onSelect={() => onSelect(item)}
                className="group flex cursor-pointer items-center rounded-lg px-2.5 py-1.5 transition-colors data-[selected=true]:bg-accent"
              >
                <EnterpriseSearchResult item={item} query={query} />
              </Command.Item>
            ))}
          </EnterpriseSearchSection>
        ),
      )}
    </>
  );
}
