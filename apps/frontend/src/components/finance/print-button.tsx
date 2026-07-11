"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Print the current statement via the browser (also the Save-as-PDF path). */
export function PrintButton({ label = "Print / PDF" }: { label?: string }) {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> {label}
    </Button>
  );
}
