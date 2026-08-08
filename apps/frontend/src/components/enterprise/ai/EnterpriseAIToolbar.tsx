"use client";

import { Plus, History, Pin, Download, Trash2, Settings2, Keyboard, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAI } from "./EnterpriseAIProvider";

/**
 * AI header toolbar. New chat is a first-class button (wired to the placeholder `newChat`); the rest
 * (History, Pinned, Export, Clear, Settings, Shortcuts) are architecture placeholders in an overflow
 * menu. No behavior beyond clearing the local placeholder conversation.
 */
export function EnterpriseAIToolbar() {
  const { newChat } = useAI();

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={newChat}
        aria-label="New chat"
        title="New chat"
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="AI options"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="gap-2 text-xs"><History className="size-4 text-muted-foreground" aria-hidden="true" />History</DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-xs"><Pin className="size-4 text-muted-foreground" aria-hidden="true" />Pinned chats</DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-xs"><Download className="size-4 text-muted-foreground" aria-hidden="true" />Export</DropdownMenuItem>
          <DropdownMenuItem onClick={newChat} className="gap-2 text-xs"><Trash2 className="size-4 text-muted-foreground" aria-hidden="true" />Clear conversation</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-xs"><Settings2 className="size-4 text-muted-foreground" aria-hidden="true" />Settings</DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-xs"><Keyboard className="size-4 text-muted-foreground" aria-hidden="true" />Keyboard shortcuts</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
