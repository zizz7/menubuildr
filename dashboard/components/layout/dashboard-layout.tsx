'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRestaurantStore } from '@/lib/store/restaurant-store';
import { useSidebarStore } from '@/lib/store/sidebar-store';
import apiClient from '@/lib/api/client';
import { resolveAssetUrl } from '@/lib/utils';
import {
  LayoutDashboard,
  Store,
  BookOpen,
  Palette,
  Settings,
  Languages,
  FileText,
  History,
  Upload,
  Search,
  CreditCard,
  LogOut,
  Menu as MenuIcon,
  X,
  User,
  Bell,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Restaurants', href: '/dashboard/restaurants', icon: Store },
      { title: 'Menus', href: '/dashboard/menus', icon: BookOpen },
      { title: 'Search', href: '/dashboard/search', icon: Search },
    ],
  },
  {
    label: 'Customize',
    items: [
      { title: 'Theme', href: '/dashboard/theme', icon: Palette },
      { title: 'Languages', href: '/dashboard/languages', icon: Languages },
      { title: 'Allergens', href: '/dashboard/allergens', icon: FileText },
    ],
  },
  {
    label: 'Account',
    items: [
      { title: 'Import/Export', href: '/dashboard/import-export', icon: Upload },
      { title: 'Version History', href: '/dashboard/versions', icon: History },
      { title: 'Billing', href: '/dashboard/billing', icon: CreditCard },
      { title: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout, updateAdmin } = useAuthStore();
  const { selectedRestaurant } = useRestaurantStore();
  const { collapsed, toggle } = useSidebarStore();

  // Fetch full admin profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/auth/me');
        updateAdmin(res.data);
      } catch {
        // Silently fail — auth interceptor handles 401
      }
    };
    if (admin) fetchProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close drawer on route change (mobile)
  useEffect(() => {
    if (!isDesktop) setDrawerOpen(false);
  }, [pathname, isDesktop]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getPageTitle = () => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(item.href + '/')) {
          return item.title;
        }
      }
    }
    return 'Dashboard';
  };
  const renderSidebar = (isCollapsed: boolean) => (
    <div className="flex flex-col h-full">
      {/* User Profile Header */}
      <div className={cn('shrink-0 pt-6 pb-6 border-b border-sidebar-border', isCollapsed ? 'px-3' : 'px-6')}>
        <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
          <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground border border-sidebar-border overflow-hidden shrink-0 relative">
            {admin?.profileImageUrl ? (
              <img src={resolveAssetUrl(admin.profileImageUrl)} alt="" key={admin.profileImageUrl} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </div>
          <div className={cn(
            'flex flex-col min-w-0 transition-opacity duration-200',
            isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          )}>
            <span className="font-semibold text-sidebar-foreground text-sm leading-tight truncate">
              {admin?.name || admin?.email || 'User'}
            </span>
            {selectedRestaurant && (
              <span className="text-xs text-sidebar-foreground/50 truncate">{selectedRestaurant.name}</span>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className={cn(
              'px-3 text-xs font-semibold text-sidebar-foreground/40 mb-2 transition-opacity duration-200',
              isCollapsed ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100'
            )}>
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <div key={item.href} className="relative group/navitem">
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isCollapsed && 'justify-center',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className={cn(
                      'transition-opacity duration-200',
                      isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                    )}>
                      {item.title}
                    </span>
                    {item.badge && !isCollapsed && (
                      <span className="ml-auto bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                  {isCollapsed && (
                    <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover/navitem:opacity-100 pointer-events-none transition-opacity z-50">
                      {item.title}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-sidebar-border overflow-hidden">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors text-sm font-medium w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent',
            isCollapsed && 'justify-center'
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span className={cn(
            'transition-opacity duration-200',
            isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          )}>
            Log Out
          </span>
        </button>
        <p className={cn(
          'mt-3 px-3 text-[10px] text-sidebar-foreground/30 font-normal transition-opacity duration-200',
          isCollapsed ? 'opacity-0 h-0 overflow-hidden mt-0' : 'opacity-100'
        )}>
          MenuBuildr v1.0.0
        </p>
      </div>
    </div>
  );


  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar — always visible on lg+ */}
      {/* Desktop Sidebar wrapper — relative so toggle button can overflow */}
      <div className={cn(
        'hidden lg:flex shrink-0 relative transition-all duration-200 border-r border-sidebar-border',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}>
        <aside className="w-full bg-sidebar text-sidebar-foreground flex flex-col overflow-hidden relative">
          {/* Grid texture */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(249,246,240,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(249,246,240,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />
          {/* Grain */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
          }} />
          <div className="relative z-10 flex flex-col h-full">
            {renderSidebar(collapsed)}
          </div>
        </aside>
        {/* Toggle Button — vertically centered on the right edge */}
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute top-8 -right-3 w-6 h-6 flex items-center justify-center rounded-md bg-sidebar border border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors z-10 shadow-sm"
        >
          {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-50 flex lg:hidden overflow-hidden transition-opacity duration-300',
          drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/20 transition-opacity duration-300',
            drawerOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
        {/* Drawer Panel */}
        <div
          className={cn(
            'relative w-[280px] bg-sidebar text-sidebar-foreground h-full border-r border-sidebar-border flex flex-col transform transition-transform duration-300 ease-out',
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Close button inside drawer */}
          <button
            onClick={() => setDrawerOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-md bg-sidebar-accent flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          {renderSidebar(false)}
        </div>
        {/* Close area (tap outside) */}
        <div className="flex-1" onClick={() => setDrawerOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Top Header Bar */}
        <header className="shrink-0 h-14 px-4 lg:px-6 flex items-center justify-between border-b border-border bg-background sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-9 h-9 -ml-1 flex items-center justify-center rounded-md border border-input hover:bg-accent text-accent-foreground transition-colors"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-semibold text-foreground">
              {getPageTitle()}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 flex items-center justify-center rounded-md border border-input hover:bg-accent text-accent-foreground/70 transition-colors">
              <Bell className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
