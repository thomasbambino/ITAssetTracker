import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
  LogOutIcon,
  ShieldIcon,
  CloudIcon,
  AlertCircleIcon,
} from 'lucide-react';

const categoryGroups = {
  main: ['/', '/users', '/devices', '/categories', '/sites', '/departments'],
  management: ['/software', '/maintenance', '/qrcodes', '/warranties', '/management/intune', '/management/status'],
  system: ['/notifications', '/history', '/reports', '/branding', '/settings'],
};

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, navigate] = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const { toast } = useToast();
  
  // Define interfaces
  interface BrandingSettings {
    id?: number;
    companyName: string;
    logo?: string | null;
    primaryColor: string;
    accentColor?: string | null;
    siteNameColor?: string | null;
    siteNameColorSecondary?: string | null;
    siteNameGradient?: boolean | null;
    companyTagline?: string | null;
    supportEmail?: string | null;
    supportPhone?: string | null;
  }
  
  interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: 'user' | 'admin';
    department?: string | null;
  }

  // Prefetch branding settings with high priority and staleTime
  const { data: branding, isLoading: brandingLoading } = useQuery<BrandingSettings>({
    queryKey: ['/api/branding'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime in v4)
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
  
  // Fetch current user data
  const { data: currentUser, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ['/api/users/me'],
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime in v4)
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  // Define the route type with badge being optional
  type RouteType = {
    href: string;
    label: string;
    icon: React.ElementType;
    category: string;
    badge?: number;
  };

  const allRoutes: RouteType[] = [
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
      href: '/sites',
      label: 'Sites',
      icon: ServerIcon,
      category: 'main',
    },
    {
      href: '/departments',
      label: 'Departments',
      icon: UsersIcon,
      category: 'main',
    },
    {
      href: '/software',
      label: 'Software & Portals',
      icon: BoxIcon,
      category: 'main',
    },
    // User Pages (for admin to view their own account)
    {
      href: '/user-dashboard',
      label: 'My Dashboard',
      icon: CircleUserIcon,
      category: 'user',
    },
    {
      href: '/guest-devices',
      label: 'My Devices',
      icon: LaptopIcon,
      category: 'user',
    },
    {
      href: '/guest-software',
      label: 'My Software & Portals',
      icon: BoxIcon,
      category: 'user',
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
      href: '/warranties',
      label: 'Warranties',
      icon: ShieldIcon,
      category: 'management',
    },
    {
      href: '/management/intune',
      label: 'Intune Management',
      icon: CloudIcon,
      category: 'management',
    },
    {
      href: '/management/status',
      label: 'Device Management',
      icon: AlertCircleIcon,
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

  // Filter routes based on user role and customize labels
  const routes = allRoutes.filter(route => {
    // If no user data, only show dashboard (for logout transition)
    if (!currentUser) {
      return route.href === '/';
    }
    // Regular users can see dashboard, devices, software, and notifications
    if (currentUser.role === 'user') {
      return ['/', '/devices', '/software', '/notifications'].includes(route.href);
    }
    // Admins can see all routes
    return true;
  }).map(route => {
    // Customize labels for regular users to add "My" prefix
    if (currentUser?.role === 'user') {
      const userRouteLabels: Record<string, string> = {
        '/': 'My Dashboard',
        '/devices': 'My Devices',
        '/software': 'My Software & Portals',
        '/notifications': 'My Notifications'
      };
      return {
        ...route,
        label: userRouteLabels[route.href] || route.label
      };
    }
    // For admin users, use original labels (without "My" prefix for main routes)
    if (currentUser?.role === 'admin') {
      const adminRouteLabels: Record<string, string> = {
        '/': 'Dashboard',
        '/devices': 'Devices',
        '/software': 'Software & Portals',
        '/notifications': 'Notifications'
      };
      return {
        ...route,
        label: adminRouteLabels[route.href] || route.label
      };
    }
    return route;
  });

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
            : "text-foreground hover:bg-muted hover:text-primary",
          "group flex items-center px-3 py-2 text-sm font-medium transition-all duration-150 ease-in-out"
        )}
        onClick={closeMenu}
      >
        <Icon className={cn(
          "mr-3 flex-shrink-0 h-5 w-5",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
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



  return (
    <>
      {/* Header */}
      <div className="md:hidden bg-background border-b border-border w-full flex items-center justify-between p-3 shadow-sm">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-foreground hover:bg-muted mr-2" 
            onClick={toggleMenu}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            {branding?.logo ? (
              <div className="w-7 h-7 bg-card rounded-md flex items-center justify-center border border-border">
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
            <span 
              className={`ml-2 text-base font-bold ${branding?.siteNameGradient ? 'bg-clip-text text-transparent' : 'text-foreground'}`}
              style={{
                color: branding?.siteNameGradient ? 'transparent' : 'var(--foreground)',
                backgroundImage: branding?.siteNameGradient && branding?.siteNameColorSecondary
                  ? `linear-gradient(to right, ${branding?.siteNameColor || '#1E40AF'}, ${branding?.siteNameColorSecondary || '#3B82F6'})`
                  : 'none',
                backgroundClip: branding?.siteNameGradient ? 'text' : 'border-box',
                WebkitBackgroundClip: branding?.siteNameGradient ? 'text' : 'border-box'
              }}
            >
              {branding?.companyName || "AssetTrack"}
            </span>
          </div>
        </div>
        <div className="flex-grow"></div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-muted"
            onClick={toggleSearch}
          >
            <SearchIcon className="h-5 w-5" />
          </Button>
          <ThemeToggle size="sm" />
          <NotificationBell />
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="md:hidden bg-background border-b border-border w-full p-2 shadow-sm">
          <GlobalSearch />
        </div>
      )}

      {/* Menu Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={closeMenu} />
      )}

      {/* Sidebar */}
      <div className={cn(
        "md:hidden fixed inset-y-0 left-0 transform bg-background w-72 z-50 transition-transform duration-300 ease-in-out overflow-y-auto overflow-x-hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 bg-muted border-b border-border">
          <div className="flex items-center">
            {branding?.logo ? (
              <div className="w-9 h-9 bg-card rounded-md flex items-center justify-center border border-border">
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
            <span 
              className={`ml-2 text-xl font-bold ${branding?.siteNameGradient ? 'bg-clip-text text-transparent' : 'text-foreground'}`}
              style={{
                color: branding?.siteNameGradient ? 'transparent' : 'var(--foreground)',
                backgroundImage: branding?.siteNameGradient && branding?.siteNameColorSecondary
                  ? `linear-gradient(to right, ${branding?.siteNameColor || '#1E40AF'}, ${branding?.siteNameColorSecondary || '#3B82F6'})`
                  : 'none',
                backgroundClip: branding?.siteNameGradient ? 'text' : 'border-box',
                WebkitBackgroundClip: branding?.siteNameGradient ? 'text' : 'border-box'
              }}
            >
              {branding?.companyName || "AssetTrack"}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-foreground hover:bg-muted" 
            onClick={closeMenu}
          >
            <XIcon className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="px-2 py-4 space-y-4">
          {/* Main Group */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {currentUser?.role === 'user' ? 'My Account' : 'Main'}
            </h3>
            <div className="mt-1 space-y-1">
              {routes
                .filter(route => route.category === 'main')
                .map(renderNavItem)
              }
            </div>
          </div>

          {currentUser?.role === 'admin' && (
            <>
              <Separator className="mx-2" />
              
              {/* User Pages Group - Admin viewing their own account */}
              <div>
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  My Account
                </h3>
                <div className="mt-1 space-y-1">
                  {routes
                    .filter(route => route.category === 'user')
                    .map(renderNavItem)
                  }
                </div>
              </div>

              <Separator className="mx-2" />
              
              {/* Management Group */}
              <div>
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  System
                </h3>
                <div className="mt-1 space-y-1">
                  {routes
                    .filter(route => route.category === 'system')
                    .map(renderNavItem)
                  }
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="absolute bottom-0 w-full">
          <div className="flex-shrink-0 border-t border-border p-4 bg-muted">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium shadow-sm">
                  {currentUser ? (
                    <span>{currentUser.firstName[0]}{currentUser.lastName[0]}</span>
                  ) : (
                    <CircleUserIcon className="h-6 w-6" />
                  )}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">
                  {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Loading...'}
                </p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  {currentUser ? (currentUser.role === 'admin' ? 'Administrator' : 'User') : ''}
                </p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={async () => {
                    try {
                      // Clear user data immediately to prevent flash
                      queryClient.removeQueries({ queryKey: ['/api/users/me'] });
                      
                      await apiRequest({
                        url: '/api/auth/logout',
                        method: 'POST'
                      });
                      
                      // Clear all queries from cache
                      queryClient.clear();
                      
                      // Redirect immediately without showing toast to prevent flash
                      navigate('/');
                      
                      // Reload the page to ensure clean state
                      window.location.reload();
                    } catch (error) {
                      console.error('Logout error:', error);
                      toast({
                        title: "Error",
                        description: "Failed to log out. Please try again.",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Logout"
                >
                  <LogOutIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
