"use client"
import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Map, Truck, Navigation } from "lucide-react"

type UCORoute = {
  name: string
  stops: number
  collectedKg: number
  efficiency: number // percentage
  status: "Healthy" | "Delayed" | "Critical"
}

type CollectionRouteMapProps = {
  routes: UCORoute[]
}

export function CollectionRouteMap({ routes }: CollectionRouteMapProps) {
  return (
    <div className="relative w-full h-[450px] bg-muted/20 border border-border rounded-lg overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border bg-card flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Active Collection Routes (Placeholder Map)</h3>
        </div>
        <Badge variant="outline">Live GPS Sync</Badge>
      </div>
      
      {/* Map Canvas Placeholder */}
      <div className="flex-1 relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-50">
        
        {/* Render routes as overlaid cards on the fake map canvas */}
        <div className="absolute inset-0 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pointer-events-none">
          {routes.map((route, i) => (
            <div key={i} className="bg-card/95 backdrop-blur-sm border border-border shadow-sm rounded-md p-4 self-start pointer-events-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-primary">{route.name}</span>
                </div>
                <Badge variant={route.status === "Healthy" ? "default" : route.status === "Delayed" ? "secondary" : "destructive"} 
                       className={route.status === "Healthy" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200" : route.status === "Delayed" ? "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200" : ""}>
                  {route.status}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Stops Remaining</span>
                  <span className="font-medium">{route.stops}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Collected</span>
                  <span className="font-medium">{route.collectedKg} KG</span>
                </div>
                <div className="flex justify-between items-center border-t border-border/50 pt-2 mt-2">
                  <span className="text-muted-foreground text-xs flex items-center gap-1"><Navigation className="w-3 h-3"/> Efficiency</span>
                  <span className={`font-medium ${route.efficiency >= 90 ? "text-emerald-600" : route.efficiency >= 70 ? "text-amber-500" : "text-destructive"}`}>
                    {route.efficiency}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map Watermark */}
        <div className="absolute bottom-4 right-4 text-xs text-muted-foreground font-medium opacity-50 select-none">
          GIS INTEGRATION PENDING (RC9.1)
        </div>
      </div>
    </div>
  )
}
