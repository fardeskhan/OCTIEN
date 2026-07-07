import React from 'react';
import { formatDistanceToNow } from 'date-fns';

export interface ProjectionBannerProps {
  version: number;
  lagEvents: number;
  updatedAt: Date;
}

/**
 * Surfs Eventual Consistency realities directly to the user.
 */
export const ProjectionBanner: React.FC<ProjectionBannerProps> = ({ version, lagEvents, updatedAt }) => {
  if (lagEvents === 0) return null;

  return (
    <div className="bg-warning/10 border border-warning text-warning px-4 py-2 rounded text-sm mb-4 flex justify-between items-center">
      <span>
        <strong>Data Sync in Progress:</strong> This view is trailing by {lagEvents} event{lagEvents !== 1 && 's'}. 
      </span>
      <span className="text-xs">
        Projection v{version} • Updated {formatDistanceToNow(updatedAt)} ago
      </span>
    </div>
  );
};
