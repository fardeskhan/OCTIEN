"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KPICard } from "@/components/ui/kpi-card"
import { AlertTriangle, CheckCircle2, Link2 } from "lucide-react"
import { ReconItem } from "@/types"
import { mockReconData } from "@/app/(dashboard)/_data/finance"



export default function ReconciliationPage() {
  const columns: ColumnDef<ReconItem>[] = [
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "type",
      header: "Source",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="font-medium">{row.getValue("description")}</span>
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => {
        const val = row.getValue("amount") as number
        return <div className="text-right tabular-nums">{val > 0 ? "+" : ""}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      },
    },
    {
      accessorKey: "matchStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("matchStatus") as string
        if (status === "Matched") return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Matched</Badge>
        if (status === "Suggested") return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200"><Link2 className="w-3 h-3 mr-1"/> Suggested</Badge>
        return <Badge variant="outline" className="text-amber-600 border-amber-300"><AlertTriangle className="w-3 h-3 mr-1"/> Unmatched</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const status = row.getValue("matchStatus") as string
        return (
          <div className="flex justify-end">
            {status === "Suggested" && <Button size="sm" variant="ghost">Confirm Match</Button>}
            {status === "Unmatched" && <Button size="sm" variant="ghost">Find Match</Button>}
          </div>
        )
      }
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Bank Reconciliation" 
        description="Match bank feed transactions to general ledger entries."
        actions={<Button>Import Bank Statement</Button>}
      />

      <WorkspaceKPIs>
        <KPICard title="Unmatched Items" value="12" />
        <KPICard title="Suggested Matches" value="45" />
        <KPICard title="Last Synced" value="10 mins ago" />
        <KPICard title="Statement Balance" value="$850,000" />
      </WorkspaceKPIs>
      
      <FilterBar 
        placeholder="Search transactions..." 
        views={["Needs Attention", "Unmatched", "Suggested Matches", "All"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockReconData} 
        />
      </div>
    </WorkspaceLayout>
  )
}
