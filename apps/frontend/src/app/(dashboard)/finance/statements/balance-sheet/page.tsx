"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { FinancialStatementTable, FinancialRow } from "@/components/ui/financial-statement-table"
import { Button } from "@/components/ui/button"
import { mockBalanceSheetData } from "@/app/(dashboard)/_data/finance"


export default function BalanceSheetPage() {
  const [viewMode, setViewMode] = React.useState<"Actual" | "Variance">("Actual")

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Balance Sheet" 
        description="Statement of financial position at a specific point in time."
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
        views={["Today", "End of Last Month", "End of Q2 2026", "End of Year 2025"]}
      />

      <div className="flex-1 overflow-auto mt-4 pb-12">
        <FinancialStatementTable 
          data={mockBalanceSheetData} 
          showPrior={viewMode === "Variance"}
        />
      </div>
    </WorkspaceLayout>
  )
}
