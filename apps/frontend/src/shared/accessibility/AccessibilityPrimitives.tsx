import React, { useEffect, useRef } from 'react';

/**
 * Ensures ADA keyboard compliance by trapping focus within modals/drawers.
 */
export const FocusTrap: React.FC<{ children: React.ReactNode; active: boolean }> = ({ children, active }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!el) return;

    const focusableElements = el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return <div ref={containerRef}>{children}</div>;
};

/**
 * Screen-reader announcements for long-running operations.
 */
export const LiveRegion: React.FC<{ message: string; "aria-live"?: "polite" | "assertive" }> = ({ message, "aria-live": ariaLive = "polite" }) => {
  return (
    <div className="sr-only" aria-live={ariaLive} aria-atomic="true">
      {message}
    </div>
  );
};
