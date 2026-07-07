// @ts-nocheck
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MAIN_NAVIGATION } from '@/shared/config/navigation';
import { cn } from '@/lib/utils'; 

export function Sidebar() {
  const pathname = usePathname();
  
  // Driven by backend / state context
  const activeBusiness = {
    name: 'Aeterex Group',
    initials: 'AG'
  };

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col justify-between hidden md:flex">
      <div>
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">
              {activeBusiness.initials}
            </div>
            <div>
              <div className="font-bold tracking-tight leading-none text-foreground">COSMY ERP</div>
              <div className="text-xs text-muted-foreground mt-1">{activeBusiness.name}</div>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-1">
          {MAIN_NAVIGATION.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`);
            return (
              <Link 
                key={item.id} 
                href={item.route} 
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors",
                  isActive 
                    ? "bg-muted text-foreground" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.title}
                {item.badge && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="p-4">
        <div className="px-3 border-t border-border pt-4 text-[10px] text-muted-foreground uppercase tracking-widest text-center">
          Powered by <span className="font-semibold text-foreground">AETEREX</span>
        </div>
      </div>
    </aside>
  );
}
