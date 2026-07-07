import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

interface BusinessComparisonCardProps {
  title: string
  metrics: {
    name: string
    businesses: {
      name: string
      value: string | number
      colorClass?: string
    }[]
  }[]
  className?: string
}

export function BusinessComparisonCard({
  title,
  metrics,
  className,
}: BusinessComparisonCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric, i) => (
            <div key={i} className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">{metric.name}</div>
              <div className="grid grid-cols-2 gap-4">
                {metric.businesses.map((business, j) => (
                  <div key={j} className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">{business.name}</span>
                    <span className={cn("text-lg font-semibold", business.colorClass)}>
                      {business.value}
                    </span>
                  </div>
                ))}
              </div>
              {i < metrics.length - 1 && <div className="h-px bg-border my-2" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
