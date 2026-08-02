import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { BusinessSwitcher } from "./business-switcher";
import { UserMenu } from "./user-menu";

type Business = {
  id: string;
  name: string;
  slug: string;
};

type User = {
  name: string;
  email: string;
  image?: string | null;
};

export function Topbar({
  user,
  businesses,
  currentBusinessId,
}: {
  user: User;
  businesses: Business[];
  currentBusinessId?: string;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 print:hidden">
      <div className="flex items-center gap-4">
        <BusinessSwitcher
          businesses={businesses}
          currentBusinessId={currentBusinessId}
        />
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
        </Button>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
