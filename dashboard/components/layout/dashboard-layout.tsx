'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRestaurantStore } from '@/lib/store/restaurant-store';
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
  const { admin, logout } = useAuthStore();
  const { selectedRestaurant } = useRestaurantStore();

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

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* User Profile Header */}
      <div className="shrink-0 pt-6 pb-6 px-6 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 border border-gray-600">
            <User className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
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
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.title}</span>
                  {item.badge && (
                    <span className="ml-auto bg-white text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-gray-800/50">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors text-sm font-medium w-full px-3 py-2 rounded-lg hover:bg-white/5"
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span>Log Out</span>
        </button>
        <p className="mt-3 px-3 text-[10px] text-gray-600 font-medium">MenuBuildr v1.0.0</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop Sidebar — always visible on lg+ */}
      <aside className="hidden lg:flex w-[260px] bg-gray-900 text-white flex-col shrink-0">
        {sidebar}
      </aside>

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
          {sidebar}
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
