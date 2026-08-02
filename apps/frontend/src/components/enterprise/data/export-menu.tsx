"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toCsv } from "@/lib/csv";

/**
 * A pluggable export format. New formats (xlsx, xml, …) can be added by pushing another
 * `ExportFormat` into the `formats` prop — the page/table code never changes.
 */
export interface ExportFormat<T> {
  id: string;
  label: string;
  extension: string;
  mime: string;
  serialize: (rows: T[], columns?: string[]) => string | Blob;
}

/** Built-in CSV export. */
export function csvFormat<T extends Record<string, unknown>>(): ExportFormat<T> {
  return {
    id: "csv",
    label: "CSV (.csv)",
    extension: "csv",
    mime: "text/csv;charset=utf-8",
    serialize: (rows, columns) => toCsv(rows, columns),
  };
}

/** Built-in JSON export — demonstrates the format is a plug-in, not hard-coded. */
export function jsonFormat<T>(): ExportFormat<T> {
  return {
    id: "json",
    label: "JSON (.json)",
    extension: "json",
    mime: "application/json",
    serialize: (rows) => JSON.stringify(rows, null, 2),
  };
}

function download(filename: string, content: string | Blob, mime: string) {
  const blob = typeof content === "string" ? new Blob([content], { type: mime }) : content;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function EnterpriseExportMenu<T extends Record<string, unknown>>({
  data,
  filename = "export",
  columns,
  formats,
  disabled,
}: {
  data: T[];
  /** Base filename without extension. */
  filename?: string;
  /** Restrict/order the exported columns. */
  columns?: string[];
  /** Formats offered; defaults to CSV + JSON. */
  formats?: ExportFormat<T>[];
  disabled?: boolean;
}) {
  const fmts = formats ?? [csvFormat<T>(), jsonFormat<T>()];
  const stamp = new Date().toISOString().slice(0, 10);

  function run(fmt: ExportFormat<T>) {
    if (data.length === 0) return;
    download(`${filename}-${stamp}.${fmt.extension}`, fmt.serialize(data, columns), fmt.mime);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || data.length === 0}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {fmts.map((f) => (
          <DropdownMenuItem key={f.id} onSelect={() => run(f)}>
            {f.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
