"use client";

import * as React from "react";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseCsv } from "@/lib/csv";

export interface EnterpriseImportResult {
  imported: number;
  message?: string;
}

/**
 * Generic CSV import dialog. The page supplies an `onImport(rows)` handler (typically a server
 * action) — this component handles file selection, parsing, column validation and preview.
 */
export function EnterpriseImportDialog({
  open,
  onOpenChange,
  title = "Import from CSV",
  description,
  expectedColumns,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  /** If provided, the file must contain these header columns (case-insensitive). */
  expectedColumns?: string[];
  onImport: (rows: Record<string, string>[]) => Promise<EnterpriseImportResult | void>;
}) {
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]);
    setHeaders([]);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.rows.length === 0) {
        toast.error("No data rows found in the file");
        reset();
        return;
      }
      if (expectedColumns && expectedColumns.length > 0) {
        const lower = parsed.headers.map((h) => h.toLowerCase());
        const missing = expectedColumns.filter((c) => !lower.includes(c.toLowerCase()));
        if (missing.length > 0) {
          toast.error(`Missing required column(s): ${missing.join(", ")}`);
          reset();
          return;
        }
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
    } catch {
      toast.error("Could not read the file");
      reset();
    }
  }

  async function runImport() {
    if (rows.length === 0) return;
    setPending(true);
    try {
      const result = await onImport(rows);
      const imported = result && "imported" in result ? result.imported : rows.length;
      toast.success(result?.message ?? `Imported ${imported} record${imported === 1 ? "" : "s"}`);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setPending(false);
    }
  }

  const previewHeaders = headers.slice(0, 5);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? "Upload a .csv file. The first row must contain column headers."}
            {expectedColumns && expectedColumns.length > 0 && (
              <span className="mt-1 block text-xs">
                Required columns: <span className="font-medium">{expectedColumns.join(", ")}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-8 text-center hover:bg-muted/40">
            <UploadCloud className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">{fileName || "Choose a CSV file"}</span>
            <span className="text-xs text-muted-foreground">
              {rows.length > 0 ? `${rows.length} row${rows.length === 1 ? "" : "s"} ready to import` : "Click to browse"}
            </span>
            <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          </label>

          {rows.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-md border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/40">
                  <tr>
                    {previewHeaders.map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      {previewHeaders.map((h) => (
                        <td key={h} className="px-3 py-1.5 text-muted-foreground">{r[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={runImport} disabled={pending || rows.length === 0}>
            {pending ? "Importing…" : `Import${rows.length ? ` ${rows.length}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
