"use client"
import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, Droplet, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type SourceHealthCardProps = {
  name: string
  volumeKg: number
  qualityGrade: "A" | "B" | "C" | "Reject"
  growthTrend: number // percentage
  missedPickupPct: number
  frequency: string
}

export function SourceHealthCard({ name, volumeKg, qualityGrade, growthTrend, missedPickupPct, frequency }: SourceHealthCardProps) {
  
  let healthStatus = "Healthy"
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default"
  let badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"

  if (missedPickupPct > 5 || qualityGrade === "Reject" || qualityGrade === "C") {
    healthStatus = "At Risk"
    badgeVariant = "secondary"
    badgeClass = "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
  }
  if (missedPickupPct > 10) {
    healthStatus = "Critical"
    badgeVariant = "destructive"
    badgeClass = ""
  }

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Droplet className="h-3 w-3" /> UCO Source Health
            </p>
          </div>
          <Badge variant={badgeVariant} className={badgeClass}>
            {healthStatus}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Volume</p>
            <p className="font-medium">{volumeKg} kg</p>
          </div>
          <div>
             <p className="text-xs text-muted-foreground mb-1">Quality</p>
             <p className={`font-medium ${qualityGrade === 'A' ? 'text-emerald-600' : qualityGrade === 'Reject' ? 'text-destructive' : ''}`}>{qualityGrade} Grade</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Growth</p>
            <div className="flex items-center gap-1 font-medium">
              {growthTrend >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-destructive" />
              )}
              <span className={growthTrend >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}>
                {Math.abs(growthTrend)}%
              </span>
            </div>
          </div>
          <div>
             <p className="text-xs text-muted-foreground mb-1">Missed Pickups</p>
             <p className={`font-medium flex items-center gap-1 ${missedPickupPct > 5 ? "text-amber-500" : ""}`}>
               {missedPickupPct > 5 && <AlertTriangle className="h-3 w-3" />}
               {missedPickupPct}%
             </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
