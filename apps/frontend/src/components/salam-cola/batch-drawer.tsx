"use client"
import * as React from "react"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { ProductionBatch } from "@/types"

type BatchDrawerProps = {
  batch: ProductionBatch | null
  onClose: () => void
}

export function BatchDetailDrawer({ batch, onClose }: BatchDrawerProps) {
  if (!batch) return null

  return (
    <EntityDrawer
      open={!!batch}
      onOpenChange={(open) => !open && onClose()}
      title={`Batch: ${batch.id}`}
      kpis={
        <>
          <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0">
            <span className="text-xs text-muted-foreground">Product</span>
            <span className="font-semibold">{batch.product}</span>
          </div>
          <div className="flex flex-col gap-1 border-r border-border px-4">
            <span className="text-xs text-muted-foreground">Quantity</span>
            <span className="font-semibold">{batch.quantityProduced.toLocaleString()} units</span>
          </div>
          <div className="flex flex-col gap-1 border-r border-border px-4">
            <span className="text-xs text-muted-foreground">Date</span>
            <span className="font-semibold">{batch.productionDate}</span>
          </div>
          <div className="flex flex-col gap-1 px-4">
            <span className="text-xs text-muted-foreground">Status</span>
            <Badge className="w-fit" variant={
              batch.status === "Released" ? "default" :
              batch.status === "QA Hold" ? "secondary" : 
              batch.status === "Recalled" ? "destructive" : "outline"
            }>
              {batch.status}
            </Badge>
          </div>
        </>
      }
      tabs={
        <div className="flex gap-4 border-b border-border mt-4">
          <div className="border-b-2 border-primary pb-2 text-sm font-medium cursor-pointer">Summary</div>
          <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Traceability</div>
          <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Quality</div>
          <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Documents</div>
          <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Audit</div>
        </div>
      }
      actions={
        <>
          <Button variant="outline">Print Label</Button>
          <Button>Edit Batch</Button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-4">Manufacturing Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Contract Manufacturer</span>
              <p className="text-sm font-medium text-primary cursor-pointer hover:underline">{batch.manufacturer}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Filling Partner</span>
              <p className="text-sm font-medium text-primary cursor-pointer hover:underline">{batch.fillingPartner}</p>
            </div>
          </div>
        </div>
        
        <div>
           <h3 className="text-sm font-medium mb-4">Traceability Summary</h3>
           <div className="text-sm text-muted-foreground p-4 bg-muted/20 border border-border rounded-md">
              Traceability graph will be displayed here. Showing linked raw material lots, syrup batches, and water test certificates.
           </div>
        </div>
      </div>
    </EntityDrawer>
  )
}
