'use client';

import { Search, Bell, Menu, ChevronDown, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function Topbar() {
  const { setTheme, theme } = useTheme();

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <Menu className="w-5 h-5" />
        </button>
        {/* Explicit Business Context */}
        <div className="hidden md:flex flex-col border-l border-border pl-6 ml-2">
           <div className="text-sm font-bold text-foreground">Salam Cola</div>
           <div className="text-xs text-muted-foreground">Dubai Warehouse</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Command Palette Trigger */}
        <button className="hidden sm:flex items-center justify-between w-64 px-3 py-1.5 border border-border rounded-md bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>Search...</span>
          </div>
          <kbd className="inline-flex items-center gap-1 text-[10px] font-medium opacity-100 bg-background px-1.5 rounded border border-border">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-muted-foreground hover:text-foreground relative"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="p-2 text-muted-foreground hover:text-foreground relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border-2 border-card"></span>
        </button>

        {/* User Dropdown Profile Placeholder */}
        <div className="flex items-center gap-2 cursor-pointer ml-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
            JD
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
