import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  MenuIcon,
  XIcon,
  LayoutDashboardIcon,
  UsersIcon,
  LaptopIcon,
  TagIcon,
  BoxIcon,
  HistoryIcon,
  FileBarChart2Icon,
  SettingsIcon,
} from 'lucide-react';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
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

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div className="md:hidden bg-primary text-primary-foreground w-full flex items-center justify-between p-4">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-auto">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M7 7h10" />
            <path d="M7 12h10" />
            <path d="M7 17h10" />
          </svg>
          <span className="ml-2 text-xl font-semibold">AssetTrack</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-primary-foreground hover:bg-primary/80" 
          onClick={toggleMenu}
        >
          {isOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </Button>
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={closeMenu} />
      )}

      <div className={cn(
        "md:hidden fixed inset-y-0 left-0 transform bg-primary text-primary-foreground w-64 z-50 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-primary/50">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-auto">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h10" />
              <path d="M7 12h10" />
              <path d="M7 17h10" />
            </svg>
            <span className="ml-2 text-xl font-semibold">AssetTrack</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-primary-foreground hover:bg-primary/80" 
            onClick={closeMenu}
          >
            <XIcon className="h-6 w-6" />
          </Button>
        </div>
        
        <nav className="mt-5 px-2 space-y-1">
          {routes.map((route) => {
            const isActive = location === route.href;
            const Icon = route.icon;
            
            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  isActive
                    ? "bg-primary/80 text-primary-foreground"
                    : "text-primary-foreground/80 hover:bg-primary/60 hover:text-primary-foreground",
                  "group flex items-center px-2 py-2 text-base font-medium rounded-md"
                )}
                onClick={closeMenu}
              >
                <Icon className="mr-4 flex-shrink-0 h-6 w-6" />
                {route.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 w-full">
          <div className="flex-shrink-0 flex border-t border-primary/50 p-4">
            <div className="flex items-center">
              <div>
                <div className="h-10 w-10 rounded-full bg-primary/70 flex items-center justify-center text-sm font-medium text-primary-foreground">
                  AU
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-primary-foreground">Admin User</p>
                <p className="text-xs font-medium text-primary-foreground/70">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
