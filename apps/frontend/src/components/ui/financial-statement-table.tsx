"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight, ChevronDown } from "lucide-react"

export type FinancialRow = {
  id: string
  label: string
  isTotal?: boolean
  isSubtotal?: boolean
  level?: number
  values: {
    actual: number
    budget?: number
    prior?: number
    variance?: number
    variancePercent?: number
  }
  children?: FinancialRow[]
}

type FinancialStatementTableProps = {
  data: FinancialRow[]
  className?: string
  showBudget?: boolean
  showPrior?: boolean
  currencySymbol?: string
}

export function FinancialStatementTable({
  data,
  className,
  showBudget = false,
  showPrior = false,
  currencySymbol = "$"
}: FinancialStatementTableProps) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined) return "-"
    const isNegative = val < 0
    const absVal = Math.abs(val)
    const formatted = absVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return isNegative ? `(${currencySymbol}${formatted})` : `${currencySymbol}${formatted}`
  }

  const formatPercent = (val: number | undefined) => {
    if (val === undefined) return "-"
    const isNegative = val < 0
    return `${isNegative ? "" : "+"}${val.toFixed(1)}%`
  }

  const renderRow = (row: FinancialRow, depth: number = 0) => {
    const hasChildren = row.children && row.children.length > 0
    const isExpanded = expanded[row.id]
    const indent = depth * 1.5

    return (
      <React.Fragment key={row.id}>
        <div 
          className={cn(
            "grid items-center py-2 px-4 border-b border-border transition-colors hover:bg-muted/50",
            row.isTotal ? "font-bold bg-muted/20 border-t-2" : "",
            row.isSubtotal ? "font-semibold bg-muted/10 border-t" : "",
            hasChildren ? "cursor-pointer" : "",
            showBudget || showPrior ? "grid-cols-6" : "grid-cols-2"
          )}
          onClick={() => hasChildren && toggleExpand(row.id)}
        >
          <div className={cn(
            "flex items-center gap-1", 
            showBudget || showPrior ? "col-span-2" : "col-span-1"
          )} style={{ paddingLeft: `${indent}rem` }}>
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <div className="w-4" />
            )}
            <span className={cn(row.isTotal ? "uppercase tracking-wide text-xs" : "text-sm")}>{row.label}</span>
          </div>

          <div className="text-right text-sm tabular-nums font-medium">
            {formatCurrency(row.values.actual)}
          </div>

          {showBudget && (
            <div className="text-right text-sm tabular-nums text-muted-foreground">
              {formatCurrency(row.values.budget)}
            </div>
          )}

          {showPrior && (
            <div className="text-right text-sm tabular-nums text-muted-foreground">
              {formatCurrency(row.values.prior)}
            </div>
          )}

          {(showBudget || showPrior) && (
            <div className={cn(
              "text-right text-sm tabular-nums flex items-center justify-end gap-2",
              (row.values.variance || 0) < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-500"
            )}>
              <span>{formatCurrency(row.values.variance)}</span>
              {row.values.variancePercent !== undefined && (
                <span className="text-xs px-1.5 py-0.5 rounded-sm bg-muted/50 text-muted-foreground ml-2">
                  {formatPercent(row.values.variancePercent)}
                </span>
              )}
            </div>
          )}
        </div>
        
        {isExpanded && row.children && (
          <div>
            {row.children.map(child => renderRow(child, depth + 1))}
          </div>
        )}
      </React.Fragment>
    )
  }

  return (
    <div className={cn("rounded-md border border-border bg-card", className)}>
      <div className={cn(
        "grid items-center py-2 px-4 border-b border-border bg-muted/40 font-medium text-xs text-muted-foreground uppercase tracking-wider",
        showBudget || showPrior ? "grid-cols-6" : "grid-cols-2"
      )}>
        <div className={showBudget || showPrior ? "col-span-2" : "col-span-1"}>Account</div>
        <div className="text-right">Actual</div>
        {showBudget && <div className="text-right">Budget</div>}
        {showPrior && <div className="text-right">Prior Period</div>}
        {(showBudget || showPrior) && <div className="text-right">Variance</div>}
      </div>
      
      <div className="flex flex-col">
        {data.map(row => renderRow(row, 0))}
      </div>
    </div>
  )
}
