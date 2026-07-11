"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Building2, Plus, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { switchBusiness } from "@/app/actions/business";
import { toast } from "sonner";

type Business = {
  id: string;
  name: string;
  slug: string;
};

export function BusinessSwitcher({
  businesses,
  currentBusinessId,
}: {
  businesses: Business[];
  currentBusinessId?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const selectedBusiness = businesses.find((b) => b.id === currentBusinessId);

  const handleSelect = (businessId: string) => {
    if (businessId === currentBusinessId) return;

    startTransition(async () => {
      try {
        await switchBusiness(businessId);
        toast.success("Business context updated");
        // router.refresh() is handled by revalidatePath in the server action
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to switch business",
        );
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label="Select a business"
          className="w-[200px] justify-between"
          disabled={isPending}
        >
          <Building2 className="mr-2 h-4 w-4 opacity-50" />
          {selectedBusiness ? selectedBusiness.name : "Select Business..."}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>COSMY Group</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {businesses.map((business) => (
          <DropdownMenuItem
            key={business.id}
            onClick={() => handleSelect(business.id)}
            className="text-sm"
          >
            <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
            {business.name}
            <Check
              className={cn(
                "ml-auto h-4 w-4",
                currentBusinessId === business.id ? "opacity-100" : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/business" />} className="text-sm">
          <Settings2 className="mr-2 h-4 w-4 text-muted-foreground" />
          Manage businesses
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/business/new" />} className="text-sm">
          <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
          Create business
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
