import * as React from "react"
import { Card } from "./card"
import { MapPin, Navigation } from "lucide-react"

interface RouteMapPanelProps {
  activeRoutes?: number
  className?: string
}

export function RouteMapPanel({ activeRoutes = 0, className }: RouteMapPanelProps) {
  return (
    <Card className={className}>
      <div className="w-full h-full min-h-[300px] bg-muted/30 flex flex-col items-center justify-center relative overflow-hidden rounded-md border border-border">
        
        {/* Placeholder decorative elements to simulate map routes */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
             <defs>
               <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                 <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
               </pattern>
             </defs>
             <rect width="100%" height="100%" fill="url(#grid)" />
             <path d="M 100 100 Q 200 50, 300 200 T 500 150" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4,4" />
           </svg>
        </div>

        <div className="absolute top-4 left-4 flex gap-2">
           <div className="bg-background/80 backdrop-blur text-xs font-medium px-2 py-1 rounded border shadow-sm">
             {activeRoutes} Active Routes
           </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-muted-foreground z-10 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Logistics Route Map</h3>
          <p className="text-sm max-w-[250px]">
            Geospatial map integration will be added in a future update.
          </p>
        </div>

      </div>
    </Card>
  )
}
