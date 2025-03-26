import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
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
  LogOutIcon,
  ShieldIcon,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useToast } from '@/hooks/use-toast';

const categoryGroups = {
  main: ['/', '/users', '/devices', '/categories'],
  management: ['/software', '/maintenance', '/qrcodes', '/warranties'],
  system: ['/notifications', '/history', '/reports', '/branding', '/settings'],
};

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Define interfaces
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
      href: '/warranties',
      label: 'Warranties',
      icon: ShieldIcon,
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

  const renderNavItem = (route: typeof routes[0]) => {
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

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
        <div className="flex flex-col h-0 flex-1">
          {/* Logo */}
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-50">
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
          </div>
          
          {/* Navigation Links */}
          <div className="flex-1 flex flex-col pt-2 pb-4 overflow-y-auto">
            <nav className="flex-1 px-2 space-y-4">
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
            </nav>
          </div>
          
          {/* User Info */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50">
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
                <p className="text-sm font-medium text-gray-800">
                  {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Loading...'}
                </p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">
                  {currentUser ? (currentUser.role === 'admin' ? 'Administrator' : 'User') : ''}
                </p>
              </div>
              <div className="ml-auto flex items-center space-x-2">
                <ThemeToggle size="sm" />
                <NotificationBell />
                <Link href="/settings" className="text-gray-500 hover:text-primary">
                  <SettingsIcon className="h-5 w-5" />
                </Link>
                <button
                  onClick={async () => {
                    try {
                      await apiRequest({
                        url: '/api/auth/logout',
                        method: 'POST'
                      });
                      
                      // Clear all queries from cache
                      queryClient.clear();
                      
                      // Show success message
                      toast({
                        title: "Logged out",
                        description: "You have been successfully logged out."
                      });
                      
                      // Redirect to login page
                      navigate('/');
                      
                      // Reload the page to ensure clean state
                      setTimeout(() => {
                        window.location.reload();
                      }, 300);
                    } catch (error) {
                      console.error('Logout error:', error);
                      toast({
                        title: "Error",
                        description: "Failed to log out. Please try again.",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOutIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
