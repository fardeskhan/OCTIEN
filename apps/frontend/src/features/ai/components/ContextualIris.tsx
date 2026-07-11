import React from 'react';
import { ContextualIrisMetadata } from '@/shared/types/ContextualIris';

export interface ContextualIrisProps {
  context: ContextualIrisMetadata;
}

/**
 * Contextual AI Assistant.
 * Receives explicitly bounded context from the workspace so it never hallucinates
 * access to unauthorized endpoints or objects.
 */
export const ContextualIris: React.FC<ContextualIrisProps> = ({ context }) => {
  return (
    <div className="bg-surfaceSecondary p-4 rounded border border-border">
      <h3 className="text-primary font-bold mb-2 flex items-center gap-2">
        <span role="img" aria-label="AI Sparkles">✨</span> Ask IRIS
      </h3>
      <p className="text-sm text-textSecondary mb-4">
        IRIS is aware you are viewing <strong>{context.entityType} {context.entityId}</strong> 
        in the {context.capability} capability (v{context.currentProjectionVersion}).
      </p>

      <div className="flex flex-col gap-2">
        <button className="text-left text-sm p-2 bg-surface hover:bg-surfaceSecondary rounded border border-border">
          Why can't this order be confirmed?
        </button>
        <button className="text-left text-sm p-2 bg-surface hover:bg-surfaceSecondary rounded border border-border">
          Summarize this order's history
        </button>
        <button className="text-left text-sm p-2 bg-surface hover:bg-surfaceSecondary rounded border border-border">
          Suggest next action
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <input 
          type="text" 
          placeholder="Ask a question..." 
          className="flex-1 p-2 text-sm rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button className="bg-primary text-white px-4 py-2 rounded text-sm font-semibold hover:bg-primary/90">
          Send
        </button>
      </div>
    </div>
  );
};
