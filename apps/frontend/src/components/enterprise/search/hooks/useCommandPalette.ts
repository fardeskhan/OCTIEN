"use client";

import { useEnterpriseSearch } from "../EnterpriseSearchProvider";

/** Focused hook for opening/closing the command palette (a thin view over the search platform). */
export function useCommandPalette() {
  const { open, setOpen } = useEnterpriseSearch();
  return { open, setOpen, toggle: () => setOpen(!open) };
}
