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
      <div className={cn('shrink-0 pt-6 pb-6 border-b border-gray-800/50', isCollapsed ? 'px-3' : 'px-6')}>
        <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 border border-gray-600 overflow-hidden shrink-0 relative">
            {admin?.profileImageUrl ? (
              <img src={resolveAssetUrl(admin.profileImageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </div>
          <div className={cn(
            'flex flex-col min-w-0 transition-opacity duration-200',
            isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          )}>
            <span className="font-semibold text-white text-sm leading-tight truncate">
              {admin?.name || admin?.email || 'User'}
            </span>
            {selectedRestaurant && (
              <span className="text-xs text-gray-400 truncate">{selectedRestaurant.name}</span>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className={cn(
              'px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 transition-opacity duration-200',
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
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isCollapsed && 'justify-center',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
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
                      <span className="ml-auto bg-white text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                  {isCollapsed && (
                    <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover/navitem:opacity-100 pointer-events-none transition-opacity z-50">
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
      <div className="shrink-0 p-4 border-t border-gray-800/50 overflow-hidden">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 text-gray-500 hover:text-white transition-colors text-sm font-medium w-full px-3 py-2 rounded-lg hover:bg-white/5',
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
          'mt-3 px-3 text-[10px] text-gray-600 font-medium transition-opacity duration-200',
          isCollapsed ? 'opacity-0 h-0 overflow-hidden mt-0' : 'opacity-100'
        )}>
          MenuBuildr v1.0.0
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop Sidebar — always visible on lg+ */}
      {/* Desktop Sidebar wrapper — relative so toggle button can overflow */}
      <div className={cn(
        'hidden lg:flex shrink-0 relative transition-all duration-200',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}>
        <aside className="w-full bg-gray-900 text-white flex flex-col overflow-hidden">
          {renderSidebar(collapsed)}
        </aside>
        {/* Toggle Button — vertically centered on the right edge */}
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors z-10"
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
            'absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300',
            drawerOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
        {/* Drawer Panel */}
        <div
          className={cn(
            'relative w-[82%] max-w-[300px] bg-gray-900 text-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out',
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Close button inside drawer */}
          <button
            onClick={() => setDrawerOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          {renderSidebar(false)}
        </div>
        {/* Close area (tap outside) */}
        <div className="flex-1" onClick={() => setDrawerOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="shrink-0 h-14 px-4 lg:px-6 flex items-center justify-between border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-9 h-9 -ml-1 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-gray-900 tracking-tight">
              {getPageTitle()}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
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
