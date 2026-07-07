// @ts-nocheck
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selectedBusiness = businesses.find((b) => b.id === currentBusinessId);

  const handleSelect = (businessId: string) => {
    setOpen(false);
    if (businessId === currentBusinessId) return;

    startTransition(async () => {
      try {
        await switchBusiness(businessId);
        toast.success("Business context updated");
        // router.refresh() is handled by revalidatePath in the server action
      } catch (error: any) {
        toast.error(error.message || "Failed to switch business");
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a business"
          className="w-[200px] justify-between"
          disabled={isPending}
        >
          <Building2 className="mr-2 h-4 w-4 opacity-50" />
          {selectedBusiness ? selectedBusiness.name : "Select Business..."}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandInput placeholder="Search business..." />
            <CommandEmpty>No business found.</CommandEmpty>
            <CommandGroup heading="COSMY GROUP">
              {businesses.map((business) => (
                <CommandItem
                  key={business.id}
                  onSelect={() => handleSelect(business.id)}
                  className="text-sm"
                >
                  <Building2 className="mr-2 h-4 w-4 text-gray-500" />
                  {business.name}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      currentBusinessId === business.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
