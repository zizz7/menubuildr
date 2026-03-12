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
  Download,
  LogOut,
  Menu as MenuIcon,
  X,
  Search,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Restaurants', href: '/dashboard/restaurants', icon: Store },
  { title: 'Menus', href: '/dashboard/menus', icon: BookOpen },
  { title: 'Theme', href: '/dashboard/theme', icon: Palette },
  { title: 'Languages', href: '/dashboard/languages', icon: Languages },
  { title: 'Allergens', href: '/dashboard/allergens', icon: FileText },
  { title: 'Search', href: '/dashboard/search', icon: Search },
  { title: 'Import/Export', href: '/dashboard/import-export', icon: Upload },
  { title: 'Version History', href: '/dashboard/versions', icon: History },
  { title: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { title: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const SIDEBAR_STORAGE_KEY = 'dashboard_sidebar_open';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAuthStore();
  const { selectedRestaurant } = useRestaurantStore();

  // Restore sidebar state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved !== null) {
        setSidebarOpen(saved === 'true');
      }
    } catch {
      // localStorage unavailable, use default
    }
  }, []);

  // Persist sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState));
    } catch {
      // localStorage unavailable, skip persistence
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-gray-900 text-white transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          {sidebarOpen && (
            <h1 className="text-xl font-bold">Menu Manager</h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-white hover:bg-gray-800"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {sidebarOpen && admin && (
            <div className="mb-3">
              <p className="text-sm text-gray-400">Logged in as</p>
              <p className="text-sm font-medium">{admin.name || admin.email}</p>
            </div>
          )}
          {selectedRestaurant && sidebarOpen && (
            <div className="mb-3">
              <p className="text-sm text-gray-400">Active Restaurant</p>
              <p className="text-sm font-medium truncate">{selectedRestaurant.name}</p>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <LogOut className="h-5 w-5 mr-3" />
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}

