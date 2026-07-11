import React, { useEffect, useState } from 'react';
import { certificationApi, CapabilityCertificationScore } from '../api/certificationApi';

/**
 * Platform Admin Dashboard treating governance and certification
 * as a living, actionable operational feature rather than dead Markdown documentation.
 */
export const CertificationDashboard: React.FC = () => {
  const [scores, setScores] = useState<CapabilityCertificationScore[]>([]);

  useEffect(() => {
    certificationApi.getPlatformScores().then(setScores);
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Platform Certification</h1>
        <p className="text-textSecondary">Real-time governance projection enforcing Reference Capability SLAs.</p>
      </header>

      <div className="grid gap-4">
        {scores.map(capability => (
          <div key={capability.capabilityId} className="flex items-center justify-between p-4 bg-surface border border-surfaceSecondary rounded hover:border-primary transition-colors cursor-pointer">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-textPrimary">{capability.name}</h2>
              <span className={`text-sm font-semibold ${
                capability.status === 'Reference Capability' ? 'text-success' : 
                capability.status === 'Release Candidate' ? 'text-info' : 
                capability.status === 'Engineering Ready' ? 'text-warning' : 
                'text-danger'
              }`}>
                {capability.status}
              </span>
            </div>
            
            <div className="flex gap-8 items-center">
              <div className="text-center">
                <p className="text-xs text-textMuted uppercase">Maturity Score</p>
                <p className={`text-2xl font-bold ${capability.score >= 96 ? 'text-success' : 'text-textPrimary'}`}>{capability.score}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-textMuted uppercase">Gates Passed</p>
                <p className="text-xl font-bold">{capability.gatesPassed} / {capability.totalGates}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-textMuted uppercase">Failing Tests</p>
                <p className={`text-xl font-bold ${capability.failingTests > 0 ? 'text-danger' : 'text-success'}`}>{capability.failingTests}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-textMuted uppercase">AI Ready</p>
                <p className="text-xl font-bold">{capability.aiGovernancePassed ? '✅' : '❌'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
