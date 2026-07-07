"use client"
import * as React from "react"
import { Badge } from "@/components/ui/badge"

type TerritoryMapProps = {
  zones: {
    name: string
    coverage: number
    distributors: number
    status: "Healthy" | "At Risk" | "Critical"
  }[]
}

export function TerritoryCoverageMap({ zones }: TerritoryMapProps) {
  return (
    <div className="relative w-full h-[400px] bg-muted/20 border border-border rounded-lg overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border bg-card flex justify-between items-center z-10">
        <h3 className="text-sm font-semibold">Territory Coverage (Placeholder Map)</h3>
        <Badge variant="outline">Live Data</Badge>
      </div>
      
      {/* Map Canvas Placeholder */}
      <div className="flex-1 relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-50">
        
        {/* Render zones as overlaid cards on the fake map canvas */}
        <div className="absolute inset-0 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map((zone, i) => (
            <div key={i} className="bg-card/95 backdrop-blur-sm border border-border shadow-sm rounded-md p-4 self-start">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-primary">{zone.name}</span>
                <Badge variant={zone.status === "Healthy" ? "default" : zone.status === "At Risk" ? "secondary" : "destructive"} 
                       className={zone.status === "Healthy" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200" : zone.status === "At Risk" ? "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200" : ""}>
                  {zone.status}
                </Badge>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coverage</span>
                  <span className="font-medium">{zone.coverage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distributors</span>
                  <span className="font-medium">{zone.distributors}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map Watermark */}
        <div className="absolute bottom-4 right-4 text-xs text-muted-foreground font-medium opacity-50 select-none">
          GIS INTEGRATION PENDING
        </div>
      </div>
    </div>
  )
}
