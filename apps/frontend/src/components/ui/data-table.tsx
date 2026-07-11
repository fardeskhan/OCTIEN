"use client"
import * as React from "react"
import { Search, Download } from "lucide-react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  RowSelectionState,
  ColumnFiltersState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  renderBulkActions?: (selectedRows: TData[]) => React.ReactNode
  /** Enables a working global search box. */
  searchPlaceholder?: string
  /** Column accessorKey to expose as a status filter dropdown. */
  statusKey?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  renderBulkActions,
  searchPlaceholder,
  statusKey,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      rowSelection,
      globalFilter,
      columnFilters,
    },
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows.map(r => r.original)

  const statusOptions = React.useMemo(() => {
    if (!statusKey) return []
    const set = new Set<string>()
    for (const row of data) {
      const v = (row as Record<string, unknown>)[statusKey]
      if (typeof v === "string") set.add(v)
    }
    return Array.from(set).sort()
  }, [data, statusKey])

  const showToolbar = searchPlaceholder || (statusKey && statusOptions.length > 0)

  // CSV export of the currently filtered rows (plain data keys only).
  function exportCsv() {
    const rows = table.getFilteredRowModel().rows.map((r) => r.original as Record<string, unknown>)
    if (rows.length === 0) return
    const keys = Object.keys(rows[0]).filter((k) => ["string", "number", "boolean"].includes(typeof rows[0][k]))
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex flex-col h-full relative">
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 pb-3">
          {searchPlaceholder && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8"
              />
            </div>
          )}
          {statusKey && statusOptions.length > 0 && (
            <select
              value={(table.getColumn(statusKey)?.getFilterValue() as string) ?? ""}
              onChange={(e) => table.getColumn(statusKey)?.setFilterValue(e.target.value || undefined)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 dark:bg-input/30"
            >
              <option value="">All statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {table.getFilteredRowModel().rows.length} record{table.getFilteredRowModel().rows.length === 1 ? "" : "s"}
            </span>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={table.getFilteredRowModel().rows.length === 0}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar overlay */}
      {selectedRows.length > 0 && renderBulkActions && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-popover border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5 fade-in">
          <span className="text-sm font-medium">{selectedRows.length} selected</span>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            {renderBulkActions(selectedRows)}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/40 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 p-2 border-t border-border">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
