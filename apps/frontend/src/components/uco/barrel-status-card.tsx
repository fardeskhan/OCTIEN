"use client"
import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cylinder, MapPin, Clock } from "lucide-react"

type BarrelStatusCardProps = {
  barrelId: string
  status: "Deployed" | "In Transit" | "Processing" | "Maintenance" | "Lost"
  capacityLiters: number
  currentLocation: string
  daysSinceLastCollection: number
}

export function BarrelStatusCard({ barrelId, status, capacityLiters, currentLocation, daysSinceLastCollection }: BarrelStatusCardProps) {
  
  let statusColor = "bg-secondary text-secondary-foreground"
  if (status === "Deployed") statusColor = "bg-emerald-100 text-emerald-800 border-emerald-200"
  else if (status === "In Transit") statusColor = "bg-blue-100 text-blue-800 border-blue-200"
  else if (status === "Maintenance" || status === "Lost") statusColor = "bg-destructive text-destructive-foreground"

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Cylinder className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-mono font-semibold text-sm">{barrelId}</h3>
          </div>
          <Badge variant={status === "Lost" || status === "Maintenance" ? "destructive" : "outline"} className={statusColor}>
            {status}
          </Badge>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
             <span className="text-muted-foreground">Capacity</span>
             <span className="font-medium">{capacityLiters} L</span>
          </div>
          <div className="flex justify-between items-start gap-4">
             <span className="text-muted-foreground flex items-center gap-1 shrink-0"><MapPin className="h-3 w-3"/> Location</span>
             <span className="font-medium text-right line-clamp-2" title={currentLocation}>{currentLocation}</span>
          </div>
          <div className="flex justify-between items-center border-t border-border pt-3">
             <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/> Last Collection</span>
             <span className={`font-medium ${daysSinceLastCollection > 14 ? 'text-amber-500' : daysSinceLastCollection > 30 ? 'text-destructive' : 'text-emerald-600'}`}>
               {daysSinceLastCollection} days ago
             </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
