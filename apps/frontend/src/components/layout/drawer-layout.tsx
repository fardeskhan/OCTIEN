import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface EntityDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  kpis?: React.ReactNode
  tabs?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function EntityDrawer({
  open,
  onOpenChange,
  title,
  kpis,
  tabs,
  actions,
  children,
  className,
}: EntityDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn("sm:max-w-2xl w-full p-0 flex flex-col h-full bg-background", className)}>
        
        {/* Header Section */}
        <div className="flex-none border-b border-border p-6 pb-4 bg-muted/20">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-xl font-semibold flex items-center justify-between">
              {title}
            </SheetTitle>
          </SheetHeader>
          
          {/* KPI Strip */}
          {kpis && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {kpis}
            </div>
          )}

          {/* Tabs Navigation */}
          {tabs && (
            <div className="-mb-4">
              {tabs}
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>

        {/* Footer Actions */}
        {actions && (
          <div className="flex-none border-t border-border p-4 bg-muted/20 flex justify-end gap-2">
            {actions}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
