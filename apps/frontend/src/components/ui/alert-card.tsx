import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { AlertCircle, AlertTriangle, Info } from "lucide-react"

interface AlertCardProps {
  title: string
  value: string | number
  variant?: "critical" | "warning" | "info"
  action?: React.ReactNode
  className?: string
}

export function AlertCard({
  title,
  value,
  variant = "critical",
  action,
  className,
}: AlertCardProps) {
  const Icon = variant === "critical" ? AlertCircle : variant === "warning" ? AlertTriangle : Info

  return (
    <Card 
      className={cn(
        "overflow-hidden flex flex-col", 
        variant === "critical" && "border-destructive bg-destructive/5 text-destructive",
        variant === "warning" && "border-warning bg-warning/5 text-warning",
        variant === "info" && "border-info bg-info/5 text-info",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between flex-1 pb-4">
        <div className="text-2xl font-bold">{value}</div>
        {action && <div className="mt-2">{action}</div>}
      </CardContent>
    </Card>
  )
}
