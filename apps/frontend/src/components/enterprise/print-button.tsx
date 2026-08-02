"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Triggers the browser print dialog. Hidden in print output itself. */
export function EnterprisePrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> {label}
    </Button>
  );
}
