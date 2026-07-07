import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react"

interface KPICardProps {
  title: string
  value: string | number
  trend?: number
  trendLabel?: string
  icon?: React.ReactNode
  variant?: "default" | "success" | "warning" | "destructive" | "info"
  freshness?: string
  className?: string
}

export function KPICard({
  title,
  value,
  trend,
  trendLabel,
  icon,
  variant = "default",
  freshness,
  className,
}: KPICardProps) {
  const isPositive = trend && trend > 0
  const isNegative = trend && trend < 0
  const isNeutral = trend === 0

  return (
    <Card className={cn("overflow-hidden flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent className="flex flex-col flex-1 pb-3">
        <div className="text-2xl font-bold">{value}</div>
        <div className="mt-1 flex items-center justify-between flex-1">
          {trend !== undefined ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span
                className={cn(
                  "flex items-center font-medium",
                  isPositive && "text-success",
                  isNegative && "text-destructive",
                  isNeutral && "text-muted-foreground"
                )}
              >
                {isPositive && <ArrowUpIcon className="w-3 h-3 mr-0.5" />}
                {isNegative && <ArrowDownIcon className="w-3 h-3 mr-0.5" />}
                {isNeutral && <MinusIcon className="w-3 h-3 mr-0.5" />}
                {Math.abs(trend)}%
              </span>
              {trendLabel && <span>{trendLabel}</span>}
            </p>
          ) : (
            <div /> 
          )}
          
          {freshness && (
            <div className="text-[10px] text-muted-foreground/60 flex items-center ml-auto">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mr-1.5" />
              {freshness}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
