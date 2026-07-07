import { LayoutDashboard, Factory, Building2, Calculator, Settings, ShieldCheck, Briefcase } from 'lucide-react';

export interface NavigationItem {
  id: string;
  title: string;
  icon: any;
  route: string;
  capability: string;
  badge?: string;
  children?: NavigationItem[];
}

export const MAIN_NAVIGATION: NavigationItem[] = [
  { id: 'dashboard', title: 'Group Dashboard', icon: LayoutDashboard, route: '/', capability: 'core' },
  { id: 'uco', title: 'UCO', icon: Factory, route: '/uco', capability: 'uco' },
  { id: 'salam-cola', title: 'Salam Cola', icon: Building2, route: '/salam-cola', capability: 'salam-cola' },
  { id: 'finance', title: 'Finance', icon: Calculator, route: '/finance', capability: 'finance' },
  { id: 'operations', title: 'Operations', icon: Briefcase, route: '/operations', capability: 'operations' },
  { id: 'governance', title: 'Governance', icon: ShieldCheck, route: '/governance', capability: 'governance' },
  { id: 'settings', title: 'Settings', icon: Settings, route: '/settings', capability: 'settings' },
];
