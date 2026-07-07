import * as React from "react"
import { cn } from "@/lib/utils"

export function WorkspaceLayout({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 p-4 md:p-6 w-full h-full max-w-screen-2xl mx-auto", className)}>
      {children}
    </div>
  )
}

export function WorkspaceHeader({ title, description, actions }: { title: React.ReactNode, description?: React.ReactNode, actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function WorkspaceFilters({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 p-2 bg-muted/40 rounded-md border border-border", className)}>
      {children}
    </div>
  )
}

export function WorkspaceKPIs({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {children}
    </div>
  )
}

export function WorkspaceGrid({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("flex-1 min-h-[400px] bg-card rounded-md border border-border shadow-sm flex flex-col overflow-hidden", className)}>
      {children}
    </div>
  )
}
