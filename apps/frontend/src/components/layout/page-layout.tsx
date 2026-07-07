import * as React from "react"
import { cn } from "@/lib/utils"

export function PageLayout({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <main className={cn("flex flex-col flex-1 w-full h-full bg-background", className)}>
      {children}
    </main>
  )
}

export function SectionLayout({ children, className, title }: { children: React.ReactNode, className?: string, title?: string }) {
  return (
    <section className={cn("flex flex-col gap-3 w-full", className)}>
      {title && <h2 className="text-xl font-medium tracking-tight text-foreground">{title}</h2>}
      {children}
    </section>
  )
}
