import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  LayoutDashboardIcon,
  UsersIcon,
  LaptopIcon,
  TagIcon,
  BoxIcon,
  HistoryIcon,
  FileBarChart2Icon,
  SettingsIcon,
} from 'lucide-react';

export function Sidebar() {
  const [location] = useLocation();

  const routes = [
    {
      href: '/',
      label: 'Dashboard',
      icon: LayoutDashboardIcon,
    },
    {
      href: '/users',
      label: 'Users',
      icon: UsersIcon,
    },
    {
      href: '/devices',
      label: 'Devices',
      icon: LaptopIcon,
    },
    {
      href: '/categories',
      label: 'Categories',
      icon: TagIcon,
    },
    {
      href: '/software',
      label: 'Software',
      icon: BoxIcon,
    },
    {
      href: '/history',
      label: 'History',
      icon: HistoryIcon,
    },
    {
      href: '/reports',
      label: 'Reports',
      icon: FileBarChart2Icon,
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: SettingsIcon,
    },
  ];

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-0 flex-1 bg-primary-800 text-white">
          {/* Logo */}
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-primary-900">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-auto text-primary-400">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h10" />
              <path d="M7 12h10" />
              <path d="M7 17h10" />
            </svg>
            <span className="ml-2 text-xl font-semibold">AssetTrack</span>
          </div>
          
          {/* Navigation Links */}
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {routes.map((route) => {
                const isActive = location === route.href;
                const Icon = route.icon;
                
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                      isActive
                        ? "bg-primary-700 text-white"
                        : "text-primary-100 hover:bg-primary-700",
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-md"
                    )}
                  >
                    <Icon className="mr-3 flex-shrink-0 h-6 w-6" />
                    {route.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          {/* User Info */}
          <div className="flex-shrink-0 flex border-t border-primary-700 p-4">
            <div className="flex items-center">
              <div>
                <div className="h-9 w-9 rounded-full bg-primary-700 flex items-center justify-center text-sm font-medium text-white">
                  AU
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">Admin User</p>
                <p className="text-xs font-medium text-primary-200">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
