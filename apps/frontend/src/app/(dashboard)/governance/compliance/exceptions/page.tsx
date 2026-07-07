"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KPICard } from "@/components/ui/kpi-card"
import { ShieldAlert, AlertTriangle } from "lucide-react"
import { ComplianceException } from "@/types"
import { mockExceptions } from "@/app/(dashboard)/_data/governance"



export default function ComplianceExceptionsPage() {
  const columns: ColumnDef<ComplianceException>[] = [
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => {
        const severity = row.getValue("severity") as string
        if (severity === "Critical") return <Badge variant="destructive"><ShieldAlert className="w-3 h-3 mr-1" /> Critical</Badge>
        return <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400"><AlertTriangle className="w-3 h-3 mr-1" /> Warning</Badge>
      }
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => <span className="font-medium">{row.getValue("source")}</span>
    },
    {
      accessorKey: "issue",
      header: "Issue Description",
      cell: ({ row }) => <span className="font-medium text-destructive">{row.getValue("issue")}</span>
    },
    {
      accessorKey: "detectedAt",
      header: "Detected At",
    },
    {
      accessorKey: "assignedTo",
      header: "Assigned To",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline">Investigate</Button>
          <Button size="sm">Resolve</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Compliance Exceptions" 
        description="Immediate attention required for failing compliance jobs, validations, and missing filings."
        actions={<Button variant="outline">Run Validations</Button>}
      />

      <WorkspaceKPIs>
        <KPICard title="Critical Exceptions" value="2" trend={1} />
        <KPICard title="Warnings" value="1" trend={-2} />
        <KPICard title="MTTR (Resolution Time)" value="4.5 hrs" />
      </WorkspaceKPIs>
      
      <FilterBar 
        placeholder="Search exceptions..." 
        views={["Requires My Action", "Critical", "All Open"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockExceptions} 
        />
      </div>
    </WorkspaceLayout>
  )
}
