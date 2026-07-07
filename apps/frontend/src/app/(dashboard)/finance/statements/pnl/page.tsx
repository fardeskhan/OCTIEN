"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { FinancialStatementTable, FinancialRow } from "@/components/ui/financial-statement-table"
import { Button } from "@/components/ui/button"
import { mockPnLData } from "@/app/(dashboard)/_data/finance"


export default function PnLPage() {
  const [viewMode, setViewMode] = React.useState<"Actual" | "Variance">("Variance")

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Profit & Loss Statement" 
        description="Comprehensive income statement with variance analysis."
        actions={
          <>
            <Button variant="outline" onClick={() => setViewMode(viewMode === "Actual" ? "Variance" : "Actual")}>
               Toggle {viewMode === "Actual" ? "Variance" : "Actual"} Mode
            </Button>
            <Button>Export PDF</Button>
          </>
        }
      />
      
      <FilterBar 
        placeholder="Filter..." 
        views={["This Month", "Last Month", "YTD", "Q3 2026"]}
      />

      <div className="flex-1 overflow-auto mt-4 pb-12">
        <FinancialStatementTable 
          data={mockPnLData} 
          showBudget={viewMode === "Variance"}
          showPrior={viewMode === "Variance"}
        />
      </div>
    </WorkspaceLayout>
  )
}
