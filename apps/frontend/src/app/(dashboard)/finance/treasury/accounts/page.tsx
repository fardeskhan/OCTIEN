"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BankAccount } from "@/types"
import { mockBankAccounts } from "@/app/(dashboard)/_data/finance"



export default function BankAccountsPage() {
  const columns: ColumnDef<BankAccount>[] = [
    {
      accessorKey: "name",
      header: "Account Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "bank",
      header: "Bank",
    },
    {
      accessorKey: "accountNumber",
      header: "Account Number",
    },
    {
      accessorKey: "currency",
      header: "Currency",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Active" ? "default" : status === "Closed" ? "secondary" : "destructive"}>
            {status}
          </Badge>
        )
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Bank Accounts" 
        description="Manage connected corporate bank accounts and integrations."
        actions={<Button>Connect New Account</Button>}
      />
      
      <FilterBar 
        placeholder="Search accounts..." 
        views={["All Active", "USD Accounts", "Closed Accounts"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockBankAccounts} 
        />
      </div>
    </WorkspaceLayout>
  )
}
