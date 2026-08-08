/**
 * Enterprise Search Platform — one search infrastructure, many consumers (command palette, global
 * search, navigation search, recent, favorites, and future AI). Decoupled from navigation.
 */
export { EnterpriseSearchProvider, useEnterpriseSearch } from "./EnterpriseSearchProvider";
export { EnterpriseCommandPalette } from "./EnterpriseCommandPalette";
export { EnterpriseGlobalSearch } from "./EnterpriseGlobalSearch";
export { EnterpriseSearchBar } from "./EnterpriseSearchBar";
export { EnterpriseSearchResults } from "./EnterpriseSearchResults";
export { EnterpriseSearchResult } from "./EnterpriseSearchResult";
export { EnterpriseSearchSection } from "./EnterpriseSearchSection";
export { EnterpriseSearchEmpty } from "./EnterpriseSearchEmpty";
export { EnterpriseSearchLoading } from "./EnterpriseSearchLoading";
export { EnterpriseSearchRecent } from "./EnterpriseSearchRecent";
export { EnterpriseSearchFilters } from "./EnterpriseSearchFilters";
export { useCommandPalette } from "./hooks/useCommandPalette";
export { useSearchController } from "./hooks/useSearchController";
export { useRecentSearches } from "./hooks/useRecentSearches";
export { quickActions, permittedQuickActions, quickActionGroups, type QuickAction } from "./lib/search-index";
export * from "./lib/search";
