import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryDefaults } from '../config/queryDefaults';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Mocking the formal 14-provider hierarchy for the reference architecture.
// In a true implementation, each of these wraps specific context logic.

const AuthenticationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const AuthorizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const CommandPaletteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const IRISProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      <TelemetryProvider>
        <AuthenticationProvider>
          <AuthorizationProvider>
            <TenantProvider>
              <QueryClientProvider client={queryClient}>
                <BrandingProvider>
                  <ThemeProvider>
                    <LocalizationProvider>
                      <FeatureFlagProvider>
                        <AccessibilityProvider>
                          <NotificationProvider>
                            <CommandPaletteProvider>
                              <IRISProvider>
                                {children}
                              </IRISProvider>
                            </CommandPaletteProvider>
                          </NotificationProvider>
                        </AccessibilityProvider>
                      </FeatureFlagProvider>
                    </LocalizationProvider>
                  </ThemeProvider>
                </BrandingProvider>
              </QueryClientProvider>
            </TenantProvider>
          </AuthorizationProvider>
        </AuthenticationProvider>
      </TelemetryProvider>
    </ErrorBoundary>
  );
};
