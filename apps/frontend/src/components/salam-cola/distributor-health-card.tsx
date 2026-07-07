"use client"
import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react"

type DistributorHealthCardProps = {
  name: string
  score: number // 0-100
  salesGrowth: number // percentage
  coverage: number // percentage
  outstandingAR: number // dollar amount
  orderFrequency: string // e.g., "Bi-weekly"
}

export function DistributorHealthCard({ name, score, salesGrowth, coverage, outstandingAR, orderFrequency }: DistributorHealthCardProps) {
  
  let scoreColor = "text-emerald-500"
  if (score < 50) scoreColor = "text-destructive"
  else if (score < 80) scoreColor = "text-amber-500"

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Activity className="h-3 w-3" /> Overall Health
            </p>
          </div>
          <div className={`text-3xl font-bold ${scoreColor}`}>
            {score}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Sales Growth</p>
            <div className="flex items-center gap-1 font-medium">
              {salesGrowth > 0 ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-destructive" />
              )}
              <span className={salesGrowth > 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}>
                {Math.abs(salesGrowth)}%
              </span>
            </div>
          </div>
          <div>
             <p className="text-xs text-muted-foreground mb-1">Coverage</p>
             <p className="font-medium">{coverage}%</p>
          </div>
          <div>
             <p className="text-xs text-muted-foreground mb-1">Outstanding AR</p>
             <p className="font-medium">${outstandingAR.toLocaleString()}</p>
          </div>
          <div>
             <p className="text-xs text-muted-foreground mb-1">Order Frequency</p>
             <p className="font-medium">{orderFrequency}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
