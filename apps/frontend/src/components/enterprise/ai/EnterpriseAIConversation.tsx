"use client";

import { EnterpriseScrollArea } from "@/components/enterprise/shell";
import { useAI } from "./EnterpriseAIProvider";
import { EnterpriseAIMessage } from "./EnterpriseAIMessage";
import { EnterpriseAIEmpty } from "./EnterpriseAIEmpty";
import { EnterpriseAILoading } from "./EnterpriseAILoading";

/**
 * The scrollable conversation transcript. Uses the frozen `EnterpriseScrollArea` (fill mode — the
 * panel is a definite-height flex column). Renders the empty state when there are no messages,
 * otherwise the message list plus a thinking indicator while busy.
 */
export function EnterpriseAIConversation() {
  const { messages, isEmpty, busy } = useAI();

  return (
    <EnterpriseScrollArea className="px-3" fadeColor="var(--card)">
      {isEmpty ? (
        <div className="py-2">
          <EnterpriseAIEmpty />
        </div>
      ) : (
        <div
          role="log"
          aria-label="Conversation"
          aria-live="polite"
          className="flex flex-col gap-3 py-4"
        >
          {messages.map((m) => (
            <EnterpriseAIMessage key={m.id} message={m} />
          ))}
          {busy && <EnterpriseAILoading />}
        </div>
      )}
    </EnterpriseScrollArea>
  );
}
