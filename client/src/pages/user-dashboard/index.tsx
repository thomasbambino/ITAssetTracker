import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/dashboard/StatCard';
import { SkeletonCard } from '@/components/ui/skeleton-card';

import { 
  Monitor, 
  Package, 
  Calendar, 
  Cpu, 
  HardDrive, 
  Building2, 
  DollarSign, 
  FileText, 
  Tag,
  ExternalLink,
  Wifi,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProblemReportForm } from '@/components/forms/ProblemReportForm';

interface AssignedDevice {
  id: number;
  name: string | null;
  brand: string;
  model: string;
  serialNumber: string | null;
  assetTag: string | null;
  status: string;
  specs: string | null;
  assignedAt: Date;
  purchaseCost: number | null;
  purchaseDate: Date | null;
  warrantyEOL: Date | null;
  notes: string | null;
  address: string | null;
  site: {
    id: number;
    name: string;
  } | null;
}

interface AssignedSoftware {
  id: number;
  softwareId: number;
  assignedAt: Date;
  licenseKey: string | null;
  notes: string | null;
  userName: string;
  deviceAssetTag: string | null;
  softwareName: string;
  software: {
    id: number;
    name: string;
    vendor: string;
    licenseType: string;
    expiryDate: Date | null;
    version?: string | null;
    status?: string;
    url?: string | null;
  };
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString();
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'N/A';
  // Convert cents to dollars
  const dollars = amount / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(dollars);
}

function getStatusColor(status: string | null | undefined): string {
  if (!status) return 'bg-gray-100 text-gray-800';
  
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-red-100 text-red-800';
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-800';
    case 'retired':
      return 'bg-gray-100 text-gray-800';
    case 'lost':
      return 'bg-red-100 text-red-800';
    case 'broken':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Active';
  
  // Capitalize first letter of each word
  return status.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [isProblemReportOpen, setIsProblemReportOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const { data: assignedDevices = [], isLoading: devicesLoading } = useQuery<AssignedDevice[]>({
    queryKey: ['/api/devices/assigned'],
    enabled: !!user?.id,
  });

  const { data: assignedSoftware = [], isLoading: softwareLoading } = useQuery<AssignedSoftware[]>({
    queryKey: [`/api/software-assignments/user/${user?.id}`],
    enabled: !!user?.id,
  });

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!user) {
    return (
      <PageContainer title="Dashboard">
        <div className="text-center py-8">
          <p>Please log in to access your dashboard.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title={`Welcome back, ${user.firstName} ${user.lastName}`}
      description="Here's an overview of your assigned devices and software licenses."
      actions={
        <Dialog open={isProblemReportOpen} onOpenChange={setIsProblemReportOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className={`gap-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
              style={{ animationDelay: '400ms' }}
            >
              <AlertTriangle className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              Report a Problem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Report a Problem</DialogTitle>
            </DialogHeader>
            <ProblemReportForm onSuccess={() => setIsProblemReportOpen(false)} />
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-8">

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {(devicesLoading || softwareLoading) ? (
            <>
              <SkeletonCard delay={0} />
              <SkeletonCard delay={100} />
              <SkeletonCard delay={200} />
              <SkeletonCard delay={300} />
            </>
          ) : (
            <>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '0ms' }}>
                <StatCard
                  icon={<Monitor className="h-6 w-6 text-blue-600" />}
                  iconClass="bg-blue-100"
                  title="My Devices"
                  value={assignedDevices.length}
                  footerText="View all"
                  footerLink="/devices"
                />
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
                <StatCard
                  icon={<Package className="h-6 w-6 text-green-600" />}
                  iconClass="bg-green-100"
                  title="Software & Portals"
                  value={assignedSoftware.length}
                  footerText="View all"
                  footerLink="/software"
                />
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
                <StatCard
                  icon={<Monitor className="h-6 w-6 text-emerald-600" />}
                  iconClass="bg-emerald-100"
                  title="Active Devices"
                  value={assignedDevices.filter(d => d.status?.toLowerCase() === 'active').length}
                  footerText="View details"
                  footerLink="/guest-devices"
                  additionalInfo={
                    assignedDevices.length > 0
                      ? {
                          text: `${Math.round((assignedDevices.filter(d => d.status?.toLowerCase() === 'active').length / assignedDevices.length) * 100)}%`,
                          type: 'success',
                        }
                      : undefined
                  }
                />
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
                <StatCard
                  icon={<Calendar className="h-6 w-6 text-orange-600" />}
                  iconClass="bg-orange-100"
                  title="Expiring Soon"
                  value={Array.isArray(assignedSoftware) ? assignedSoftware.filter(s => {
                    if (!s.software?.expiryDate) return false;
                    const expiry = new Date(s.software.expiryDate);
                    const now = new Date();
                    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
                    return expiry <= thirtyDaysFromNow;
                  }).length : 0}
                  footerText="View software"
                  footerLink="/guest-software"
                  additionalInfo={
                    Array.isArray(assignedSoftware) && assignedSoftware.filter(s => {
                      if (!s.software?.expiryDate) return false;
                      const expiry = new Date(s.software.expiryDate);
                      const now = new Date();
                      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
                      return expiry <= thirtyDaysFromNow;
                    }).length > 0
                      ? {
                          text: 'Next 30 days',
                          type: 'warning',
                        }
                      : undefined
                  }
                />
              </div>
            </>
          )}
        </div>

        {/* Assigned Devices */}
        <div className={`space-y-6 transition-all duration-500 delay-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div>
            <h2 className="text-xl font-semibold flex items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <span>My Devices</span>
            </h2>
            <p className="text-muted-foreground mt-1">
              Devices currently assigned to you
            </p>
          </div>
          
          {!Array.isArray(assignedDevices) || assignedDevices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No devices assigned to you</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {assignedDevices.map((device, index) => (
                <Card 
                  key={device.id} 
                  className={`p-4 md:p-6 transition-all duration-300 delay-${index * 100 + 600} ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  {/* Mobile-First Responsive Layout */}
                  <div className="space-y-4">
                    
                    {/* Device Header - Name, Model, Status */}
                    <div className="flex flex-col space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        <CardTitle className="text-lg sm:text-xl font-semibold">
                          {device.name || `${device.brand} ${device.model}`}
                        </CardTitle>
                        <Badge className={getStatusColor(device.status)}>
                          {device.status?.charAt(0).toUpperCase() + device.status?.slice(1).toLowerCase() || device.status}
                        </Badge>
                      </div>
                      
                      {/* Serial Number prominently displayed */}
                      {device.serialNumber && (
                        <div className="bg-muted/30 rounded-md px-3 py-2">
                          <div className="text-xs text-muted-foreground font-medium">Serial Number</div>
                          <div className="font-mono text-sm font-medium">{device.serialNumber}</div>
                        </div>
                      )}
                    </div>

                    {/* Device Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Basic Information */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center space-x-2">
                          <Package className="h-4 w-4" />
                          <span>Basic Information</span>
                        </h4>
                        <div className="space-y-2 text-sm">
                          {device.assetTag && (
                            <div className="flex items-center space-x-2">
                              <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground font-medium min-w-0">Asset Tag:</span>
                              <span className="break-all">{device.assetTag}</span>
                            </div>
                          )}
                          {device.assignedAt && (
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground font-medium">Assigned:</span>
                              <span>{formatDate(device.assignedAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location & Management */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center space-x-2">
                          <Building2 className="h-4 w-4" />
                          <span>Location & Management</span>
                        </h4>
                        <div className="space-y-2 text-sm">
                          {device.site && (
                            <div className="flex items-center space-x-2">
                              <span className="text-muted-foreground font-medium">Site:</span>
                              <span>{device.site.name}</span>
                            </div>
                          )}
                          {device.address && (
                            <div className="flex items-start space-x-2">
                              <span className="text-muted-foreground font-medium flex-shrink-0">Address:</span>
                              <span className="break-words">{device.address}</span>
                            </div>
                          )}
                          {device.warrantyEOL && (
                            <div className="flex items-center space-x-2">
                              <span className="text-muted-foreground font-medium">Warranty:</span>
                              <span>Until {formatDate(device.warrantyEOL)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Software */}
        <div className={`space-y-6 transition-all duration-500 delay-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div>
            <h2 className="text-xl font-semibold flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Software & Portals</span>
            </h2>
            <p className="text-muted-foreground mt-1">
              Software licenses and portal access currently assigned to you
            </p>
          </div>
          
          {!Array.isArray(assignedSoftware) || assignedSoftware.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No software licenses or portal access assigned to you</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedSoftware.map((assignment, index) => (
                <Card 
                  key={assignment.id} 
                  className={`border rounded-lg p-4 transition-all duration-300 delay-${index * 100 + 800} ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium flex items-center gap-2">
                        <span>{assignment.software.name} {assignment.software.version || ''}</span>
                        {assignment.software.url && (
                          <a 
                            href={assignment.software.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Open software website"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        by {assignment.software.vendor}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>License: {assignment.software.licenseType}</span>
                        <span>Assigned: {formatDate(assignment.assignedAt)}</span>
                        {assignment.software.expiryDate && (
                          <span>Expires: {formatDate(assignment.software.expiryDate)}</span>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(assignment.software.status || 'active')}>
                      {formatStatus(assignment.software.status)}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}