import * as React from "react"
import { Search, Filter, Save, X } from "lucide-react"
import { Input } from "./input"
import { Button } from "./button"
import { Badge } from "./badge"
interface FilterBarProps {
  placeholder?: string
  views?: string[]
  activeView?: string
  onViewChange?: (view: string) => void
  className?: string
}

export function FilterBar({
  placeholder = "Search...",
  views = ["All", "Open", "Pending", "My Records"],
  activeView = "All",
  onViewChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 py-2 w-full items-start sm:items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 sticky top-0">
      <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={placeholder} className="pl-8 h-8 text-[13px] w-full" />
        </div>
        
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[13px] border-dashed">
            <Filter className="mr-2 h-3 w-3" />
            Status
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[13px] border-dashed">
            <Filter className="mr-2 h-3 w-3" />
            Date Range
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <span className="text-xs text-muted-foreground hidden lg:inline-block">Saved Views:</span>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          {views.map(view => (
            <Badge 
              key={view} 
              variant={activeView === view ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => onViewChange?.(view)}
            >
              {view}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
