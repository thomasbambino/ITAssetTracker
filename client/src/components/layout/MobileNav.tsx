import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { useQuery } from '@tanstack/react-query';
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
  WrenchIcon,
  BellIcon,
  QrCodeIcon,
  PaintbrushIcon,
  ChevronRightIcon,
  ServerIcon,
  CircleUserIcon,
  SearchIcon,
  BellDotIcon,
} from 'lucide-react';

const categoryGroups = {
  main: ['/', '/users', '/devices', '/categories'],
  management: ['/software', '/maintenance', '/qrcodes'],
  system: ['/notifications', '/history', '/reports', '/branding', '/settings'],
};

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  
  // Define the BrandingSettings interface
  interface BrandingSettings {
    id?: number;
    companyName: string;
    logo?: string | null;
    primaryColor: string;
    accentColor?: string | null;
    companyTagline?: string | null;
    supportEmail?: string | null;
    supportPhone?: string | null;
  }

  // Fetch branding settings
  const { data: branding = {} as BrandingSettings } = useQuery<BrandingSettings>({
    queryKey: ['/api/branding'],
  });

  // Define the route type with badge being optional
  type RouteType = {
    href: string;
    label: string;
    icon: React.ElementType;
    category: string;
    badge?: number;
  };

  const routes: RouteType[] = [
    {
      href: '/',
      label: 'Dashboard',
      icon: LayoutDashboardIcon,
      category: 'main',
    },
    {
      href: '/users',
      label: 'Users',
      icon: UsersIcon,
      category: 'main',
    },
    {
      href: '/devices',
      label: 'Devices',
      icon: LaptopIcon,
      category: 'main',
    },
    {
      href: '/categories',
      label: 'Categories',
      icon: TagIcon,
      category: 'main',
    },
    {
      href: '/software',
      label: 'Software',
      icon: BoxIcon,
      category: 'management',
    },
    {
      href: '/maintenance',
      label: 'Maintenance',
      icon: WrenchIcon,
      category: 'management',
    },
    {
      href: '/qrcodes',
      label: 'QR Codes',
      icon: QrCodeIcon,
      category: 'management',
    },
    {
      href: '/notifications',
      label: 'Notifications',
      icon: BellIcon,
      category: 'system',
    },
    {
      href: '/history',
      label: 'History',
      icon: HistoryIcon,
      category: 'system',
    },
    {
      href: '/reports',
      label: 'Reports',
      icon: FileBarChart2Icon,
      category: 'system',
    },
    {
      href: '/branding',
      label: 'Branding',
      icon: PaintbrushIcon,
      category: 'system',
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: SettingsIcon,
      category: 'system',
    },
  ];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
  };

  const renderNavItem = (route: RouteType) => {
    const isActive = location === route.href;
    const Icon = route.icon;
    
    return (
      <Link
        key={route.href}
        href={route.href}
        className={cn(
          isActive
            ? "bg-primary/10 text-primary border-l-2 border-primary"
            : "text-gray-700 hover:bg-gray-100 hover:text-primary",
          "group flex items-center px-3 py-2 text-sm font-medium transition-all duration-150 ease-in-out"
        )}
        onClick={closeMenu}
      >
        <Icon className={cn(
          "mr-3 flex-shrink-0 h-5 w-5",
          isActive ? "text-primary" : "text-gray-500 group-hover:text-primary"
        )} />
        <span className="flex-1">{route.label}</span>
        {route.badge && (
          <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1 py-0.5 text-xs font-medium text-white bg-primary rounded-full">
            {route.badge}
          </span>
        )}
        {isActive && <ChevronRightIcon className="ml-auto h-4 w-4 text-primary opacity-70" />}
      </Link>
    );
  };

  const getCurrentPageTitle = () => {
    const route = routes.find(r => r.href === location);
    return route ? route.label : 'Home';
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 w-full flex items-center justify-between p-3 shadow-sm">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-700 hover:bg-gray-100 mr-2" 
            onClick={toggleMenu}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            {branding?.logo ? (
              <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
                <img 
                  src={branding.logo} 
                  alt="Company logo"
                  className="h-5 w-5 object-contain" 
                />
              </div>
            ) : (
              <div className="bg-primary p-1 rounded-md">
                <ServerIcon className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="ml-2 text-base font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {branding?.companyName || "AssetTrack"}
            </span>
          </div>
        </div>
        <div className="text-base font-medium text-gray-700 flex-grow text-center">
          {!showSearch && getCurrentPageTitle()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-700 hover:bg-gray-100"
            onClick={toggleSearch}
          >
            <SearchIcon className="h-5 w-5" />
          </Button>
          <NotificationBell />
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showSearch && (
        <div className="md:hidden bg-white border-b border-gray-200 w-full p-2 shadow-sm">
          <GlobalSearch />
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={closeMenu} />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "md:hidden fixed inset-y-0 left-0 transform bg-white w-72 z-50 transition-transform duration-300 ease-in-out overflow-y-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center">
            {branding?.logo ? (
              <div className="w-9 h-9 bg-white rounded-md flex items-center justify-center">
                <img 
                  src={branding.logo} 
                  alt="Company logo"
                  className="h-7 w-7 object-contain" 
                />
              </div>
            ) : (
              <div className="bg-primary p-1.5 rounded-md">
                <ServerIcon className="h-6 w-6 text-white" />
              </div>
            )}
            <span className="ml-2 text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {branding?.companyName || "AssetTrack"}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-700 hover:bg-gray-100" 
            onClick={closeMenu}
          >
            <XIcon className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="px-2 py-4 space-y-4">
          {/* Main Group */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Main
            </h3>
            <div className="mt-1 space-y-1">
              {routes
                .filter(route => route.category === 'main')
                .map(renderNavItem)
              }
            </div>
          </div>

          <Separator className="mx-2" />
          
          {/* Management Group */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Management
            </h3>
            <div className="mt-1 space-y-1">
              {routes
                .filter(route => route.category === 'management')
                .map(renderNavItem)
              }
            </div>
          </div>

          <Separator className="mx-2" />
          
          {/* System Group */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              System
            </h3>
            <div className="mt-1 space-y-1">
              {routes
                .filter(route => route.category === 'system')
                .map(renderNavItem)
              }
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 w-full">
          <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium shadow-sm">
                  <CircleUserIcon className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-800">Admin User</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Administrator</p>
              </div>
              <div className="ml-auto flex items-center space-x-1">
                <NotificationBell />
                <Link href="/settings" className="text-gray-500 hover:text-primary">
                  <SettingsIcon className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
