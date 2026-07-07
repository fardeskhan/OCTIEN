"use client"
import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, Clock, Truck, Beaker, FileWarning } from "lucide-react"

type ExceptionType = "Missed Collection" | "Rejected Oil" | "Vehicle Issue" | "Overdue Pickup" | "System Error"

type CollectionExceptionCardProps = {
  type: ExceptionType
  title: string
  description: string
  timestamp: string
  actionRequired: string
}

export function CollectionExceptionCard({ type, title, description, timestamp, actionRequired }: CollectionExceptionCardProps) {
  
  const getIcon = () => {
    switch(type) {
      case "Missed Collection": return <Clock className="h-5 w-5 text-destructive" />
      case "Rejected Oil": return <Beaker className="h-5 w-5 text-amber-500" />
      case "Vehicle Issue": return <Truck className="h-5 w-5 text-destructive" />
      case "Overdue Pickup": return <FileWarning className="h-5 w-5 text-amber-500" />
      default: return <AlertCircle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const isCritical = type === "Missed Collection" || type === "Vehicle Issue"

  return (
    <Card className={`border-l-4 ${isCritical ? 'border-l-destructive' : 'border-l-amber-500'} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4 flex gap-4 items-start">
        <div className="mt-1 shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-sm">{title}</h4>
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{timestamp}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          <div className="pt-2 mt-2 border-t border-border/50">
            <span className={`text-xs font-medium uppercase tracking-wider ${isCritical ? 'text-destructive' : 'text-amber-600 dark:text-amber-500'}`}>
              Action: {actionRequired}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
