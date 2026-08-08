/**
 * OCTIEN AI workspace — the permanent shell architecture every future AI capability plugs into.
 * Provider-agnostic by design: no LLM / MCP / workflow knowledge lives here. The provider owns UI
 * state; components render it. Placeholder content today; a future runtime swaps the message/context
 * sources with zero UI change.
 */
export { EnterpriseAIProvider, useAI } from "./EnterpriseAIProvider";
export { EnterpriseAIPanel } from "./EnterpriseAIPanel";
export { EnterpriseAILauncher } from "./EnterpriseAILauncher";
export type { AIMessage, AIMessageRole, AIContextItem, AISuggestion } from "./lib/ai";
