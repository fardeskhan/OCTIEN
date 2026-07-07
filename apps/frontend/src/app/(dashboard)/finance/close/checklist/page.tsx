"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KPICard } from "@/components/ui/kpi-card"
import { Checkbox } from "@/components/ui/checkbox"
import { CloseTask } from "@/types"
import { mockCloseTasks } from "@/app/(dashboard)/_data/finance"



export default function CloseChecklistPage() {
  const columns: ColumnDef<CloseTask>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "task",
      header: "Task Description",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.critical && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">CRITICAL</Badge>}
          <span className="font-medium">{row.getValue("task")}</span>
        </div>
      )
    },
    {
      accessorKey: "assignedTo",
      header: "Assigned To",
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Completed") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Completed</Badge>
        if (status === "Blocked") return <Badge variant="destructive">Blocked</Badge>
        if (status === "In Progress") return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>
        return <Badge variant="outline" className="text-muted-foreground">Not Started</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <div className="flex justify-end">
            <Button size="sm" variant="ghost">Update Status</Button>
          </div>
        )
      }
    }
  ]

  const completed = mockCloseTasks.filter(t => t.status === "Completed").length
  const total = mockCloseTasks.length
  const progress = Math.round((completed / total) * 100)

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="June 2026 Close Checklist" 
        description="Track progress and dependencies for the active period close."
        actions={<Button>Close Period</Button>}
      />

      <WorkspaceKPIs>
        <KPICard title="Overall Progress" value={`${progress}%`} />
        <KPICard title="Completed Tasks" value={`${completed} / ${total}`} />
        <KPICard title="Blocked Tasks" value="1" />
        <KPICard title="Days Until Deadline" value="2 Days" />
      </WorkspaceKPIs>
      
      <div className="mt-4 mb-2">
         <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium">Close Readiness</span>
            <span className="font-bold">{progress}%</span>
         </div>
         <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
         </div>
      </div>

      <FilterBar 
        placeholder="Search tasks..." 
        views={["My Tasks", "All Open Tasks", "Critical Path", "Blocked"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockCloseTasks} 
        />
      </div>
    </WorkspaceLayout>
  )
}
