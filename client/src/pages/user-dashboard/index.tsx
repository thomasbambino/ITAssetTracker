import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/layout/PageContainer';
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
  Wifi
} from 'lucide-react';

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

  const { data: assignedDevices = [] } = useQuery<AssignedDevice[]>({
    queryKey: ['/api/devices/assigned'],
    enabled: !!user?.id,
  });

  const { data: assignedSoftware = [] } = useQuery<AssignedSoftware[]>({
    queryKey: [`/api/software-assignments/user/${user?.id}`],
    enabled: !!user?.id,
  });

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
    >
      <div className="space-y-8">

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Devices</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedDevices.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Software Licenses</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedSoftware.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
              <Monitor className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assignedDevices.filter(d => d.status?.toLowerCase() === 'active').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Array.isArray(assignedSoftware) ? assignedSoftware.filter(s => {
                  if (!s.software?.expiryDate) return false;
                  const expiry = new Date(s.software.expiryDate);
                  const now = new Date();
                  const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
                  return expiry <= thirtyDaysFromNow;
                }).length : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Devices */}
        <div className="space-y-6">
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
              {assignedDevices.map((device) => (
                <Card key={device.id} className="p-6">
                  {/* Header Section */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-xl font-semibold">{device.name || `${device.brand} ${device.model}`}</CardTitle>
                        <Badge className={getStatusColor(device.status)}>
                          {device.status?.charAt(0).toUpperCase() + device.status?.slice(1).toLowerCase() || device.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        {device.brand} {device.model}
                      </CardDescription>
                    </div>
                  </div>
                  
                  {/* Main Content Grid - 3 columns on large screens */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    
                    {/* Column 1: Basic Info & Location */}
                    <div className="space-y-6">
                      {/* Basic Information */}
                      <div>
                        <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                          <Package className="h-4 w-4" />
                          <span>Basic Information</span>
                        </h4>
                        <div className="space-y-3 text-sm">
                          {device.assetTag && (
                            <div className="flex items-center space-x-2">
                              <Tag className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground font-medium">Asset Tag:</span>
                              <span>{device.assetTag}</span>
                            </div>
                          )}
                          {device.serialNumber && (
                            <div className="flex items-center space-x-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground font-medium">Serial:</span>
                              <span className="font-mono text-xs">{device.serialNumber}</span>
                            </div>
                          )}
                          {device.assignedAt && (
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground font-medium">Assigned:</span>
                              <span>{formatDate(device.assignedAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location & Management */}
                      {(device.site || device.address || device.warrantyEOL) && (
                        <div>
                          <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
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
                              <div className="flex items-center space-x-2">
                                <span className="text-muted-foreground font-medium">Address:</span>
                                <span>{device.address}</span>
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
                      )}
                    </div>

                    {/* Column 2: Technical Specifications */}
                    <div className="space-y-6">
                      {device.specs && (() => {
                        try {
                          const specs = typeof device.specs === 'string' ? JSON.parse(device.specs) : device.specs;
                          
                          // Check if there are actual non-empty spec values
                          const hasSpecs = specs && typeof specs === 'object' && 
                            (specs.ram || specs.storage || specs.graphics || specs.display);
                          
                          if (!hasSpecs) return null;
                          
                          return (
                            <div>
                              <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                                <Cpu className="h-4 w-4" />
                                <span>Technical Specifications</span>
                              </h4>
                              <div className="space-y-2 text-sm">
                                {specs.ram && (
                                  <div className="flex items-start space-x-2">
                                    <HardDrive className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <span className="font-medium text-foreground">RAM:</span>
                                      <div className="text-muted-foreground">{specs.ram}</div>
                                    </div>
                                  </div>
                                )}
                                {specs.storage && (
                                  <div className="flex items-start space-x-2">
                                    <HardDrive className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <span className="font-medium text-foreground">Storage:</span>
                                      <div className="text-muted-foreground">{specs.storage}</div>
                                    </div>
                                  </div>
                                )}
                                {specs.graphics && (
                                  <div className="flex items-start space-x-2">
                                    <Monitor className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <span className="font-medium text-foreground">Graphics:</span>
                                      <div className="text-muted-foreground">{specs.graphics}</div>
                                    </div>
                                  </div>
                                )}
                                {specs.display && (
                                  <div className="flex items-start space-x-2">
                                    <Monitor className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <span className="font-medium text-foreground">Display:</span>
                                      <div className="text-muted-foreground">{specs.display}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>

                    {/* Column 3: Financial Info & Notes */}
                    <div className="space-y-6">
                      {/* Financial Information */}
                      {(device.purchaseCost || device.purchaseDate) && (
                        <div>
                          <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                            <DollarSign className="h-4 w-4" />
                            <span>Financial Information</span>
                          </h4>
                          <div className="space-y-2 text-sm">
                            {device.purchaseCost && (
                              <div className="flex items-center space-x-2">
                                <span className="text-muted-foreground font-medium">Cost:</span>
                                <span className="font-semibold">{formatCurrency(device.purchaseCost)}</span>
                              </div>
                            )}
                            {device.purchaseDate && (
                              <div className="flex items-center space-x-2">
                                <span className="text-muted-foreground font-medium">Purchase Date:</span>
                                <span>{formatDate(device.purchaseDate)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Additional Notes */}
                      {device.notes && (
                        <div>
                          <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>Notes</span>
                          </h4>
                          <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                            {device.notes}
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Software */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>My Software Licenses</span>
            </h2>
            <p className="text-muted-foreground mt-1">
              Software licenses currently assigned to you
            </p>
          </div>
          
          {!Array.isArray(assignedSoftware) || assignedSoftware.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No software licenses assigned to you</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedSoftware.map((assignment) => (
                <Card key={assignment.id} className="border rounded-lg p-4">
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