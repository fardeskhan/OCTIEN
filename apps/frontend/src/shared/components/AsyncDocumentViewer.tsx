import React from 'react';

export interface AsyncDocumentViewerProps {
  documentId: string;
  status: 'Queued' | 'Generating' | 'Completed' | 'Expired' | 'Failed';
  downloadUrl?: string;
  onRefresh: () => void;
}

/**
 * Handles asynchronous document generation safely.
 * Users never wait on blocking PDF rendering threads.
 */
export const AsyncDocumentViewer: React.FC<AsyncDocumentViewerProps> = ({ documentId, status, downloadUrl, onRefresh }) => {
  return (
    <div className="p-4 border border-surfaceSecondary rounded bg-surface">
      <h3 className="font-semibold text-textPrimary mb-2">Document: {documentId}</h3>
      <div className="flex items-center gap-4">
        <span className={`px-2 py-1 text-xs rounded font-bold ${
          status === 'Completed' ? 'bg-success/20 text-success' :
          status === 'Failed' ? 'bg-danger/20 text-danger' :
          'bg-info/20 text-info'
        }`}>
          {status}
        </span>
        
        {status === 'Completed' && downloadUrl && (
          <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Download Document
          </a>
        )}

        {(status === 'Queued' || status === 'Generating') && (
          <button onClick={onRefresh} className="text-sm text-textSecondary underline">Refresh Status</button>
        )}
      </div>
    </div>
  );
};
