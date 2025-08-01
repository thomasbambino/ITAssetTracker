import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
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
  CloudIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
} from 'lucide-react';

// Define category groups
const categoryGroups = {
  main: ['/', '/users', '/devices', '/categories', '/sites', '/departments'],
  management: ['/software', '/maintenance', '/qrcodes', '/warranties', '/management/intune', '/management/status'],
  system: ['/notifications', '/history', '/reports', '/branding', '/settings'],
};

export function DesktopSidebar() {
  const [location, navigate] = useLocation();
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
    role: 'user' | 'manager' | 'admin';
    department?: string | null;
    isManager?: boolean;
    managedDepartmentIds?: string | null;
  }

  // Fetch branding settings
  const { data: branding } = useQuery<BrandingSettings>({
    queryKey: ['/api/branding'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
  
  // Fetch current user data
  const { data: currentUser } = useQuery<User | null>({
    queryKey: ['/api/users/me'],
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  // Define the route type
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
      label: 'My Dashboard',
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
      label: 'My Devices',
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
      label: 'My Software & Portals', 
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
      href: '/problem-reports',
      label: 'Problem Reports',
      icon: AlertTriangleIcon,
      category: 'management',
    },
    {
      href: '/notifications',
      label: 'My Notifications',
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
    {
      href: '/user-settings',
      label: 'My Settings',
      icon: SettingsIcon,
      category: 'user',
    },
  ];

  // Filter routes based on user role and customize labels
  const routes = allRoutes.filter(route => {
    // If no user data, only show dashboard (for logout transition)
    if (!currentUser) {
      return route.href === '/';
    }
    // Managers (users with isManager: true) can see dashboard, users, devices, software, notifications, and their personal pages
    if (currentUser.isManager) {
      return ['/', '/users', '/devices', '/software', '/notifications', '/user-dashboard', '/guest-devices', '/guest-software', '/user-settings'].includes(route.href);
    }
    // Regular users can see dashboard, devices, software, notifications, and user settings
    if (currentUser.role === 'user') {
      return ['/', '/devices', '/software', '/notifications', '/user-settings'].includes(route.href);
    }
    // Admins can see all routes
    return true;
  }).map(route => {
    // For manager users (isManager: true), use department-specific labels
    if (currentUser?.isManager) {
      const managerRouteLabels: Record<string, string> = {
        '/': 'Dashboard',
        '/users': 'Users',
        '/devices': 'Devices',
        '/software': 'Software & Portals',
        '/notifications': 'Notifications'
      };
      return {
        ...route,
        label: managerRouteLabels[route.href] || route.label
      };
    }
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
    <div className="hidden md:flex flex-col w-64 bg-background border-r border-border h-screen sticky top-0">
      <div className="flex items-center h-16 px-4 shadow-sm">
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
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-4">
        {/* Main Group */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {currentUser?.isManager && currentUser?.department === 'Billing' ? 'Billing' :
             currentUser?.role === 'user' ? 'My Account' : 
             'Main'}
          </h3>
          <div className="mt-1 space-y-1">
            {routes
              .filter(route => route.category === 'main')
              .map(renderNavItem)
            }
          </div>
        </div>

        {/* System Group for regular users only (not managers) */}
        {currentUser?.role === 'user' && !currentUser?.isManager && (
          <>
            <Separator className="mx-2" />
            
            <div>
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                System
              </h3>
              <div className="mt-1 space-y-1">
                {routes
                  .filter(route => route.category === 'system' || (route.category === 'user' && currentUser?.role === 'user'))
                  .map(renderNavItem)
                }
              </div>
            </div>
          </>
        )}

        {(currentUser?.isManager || currentUser?.role === 'admin') && (
          <>
            <Separator className="mx-2" />
            
            {/* User Pages Group - Manager/Admin viewing their own account */}
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

            {currentUser?.role === 'admin' && (
              <>
                <Separator className="mx-2" />
                
                {/* Management Group - Only for Admin */}
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
                
                {/* System Group - Only for Admin */}
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
          </>
        )}
      </div>
      
      <div className="flex-shrink-0 border-t border-border p-4 bg-muted">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {currentUser?.profilePhoto ? (
              <img 
                src={currentUser.profilePhoto} 
                alt={`${currentUser.firstName} ${currentUser.lastName}`}
                className="h-9 w-9 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium shadow-sm">
                {currentUser ? (
                  <span>{currentUser.firstName[0]}{currentUser.lastName[0]}</span>
                ) : (
                  <CircleUserIcon className="h-6 w-6" />
                )}
              </div>
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-foreground">
              {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Loading...'}
            </p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              {currentUser ? (
                currentUser.role === 'admin' ? 'Administrator' :
                currentUser.isManager ? 'Manager' :
                'User'
              ) : ''}
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
  );
}