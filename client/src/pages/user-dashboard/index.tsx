import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { 
  Monitor, 
  Package, 
  Calendar, 
  Tag, 
  Building2, 
  Cpu, 
  DollarSign, 
  UserCheck, 
  ChevronDown, 
  ChevronUp,
  HardDrive,
  MemoryStick,
  Wifi,
  Battery,
  Weight,
  Eye,
  Settings
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface AssignedDevice {
  id: number;
  name: string | null;
  brand: string;
  model: string;
  serialNumber: string | null;
  assetTag: string | null;
  status: string;
  purchaseDate: Date | null;
  warrantyEOL: Date | null;
  category: {
    id: number;
    name: string;
  } | null;
  site: {
    id: number;
    name: string;
  } | null;
  assignedAt: Date | null;
  assignedBy: number | null;
  assignmentNotes: string | null;
  specs: Record<string, any> | null;
  notes: string | null;
  purchaseCost: number | null;
}

interface AssignedSoftware {
  id: number;
  softwareId: number;
  assignmentDate: Date;
  expiryDate: Date | null;
  software: {
    id: number;
    name: string;
    vendor: string;
    version: string | null;
    licenseType: string;
    status: string;
  };
}

function formatDate(date: Date | string | null): string {
  if (!date) return "Not specified";
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getStatusColor(status: string | null | undefined): string {
  if (!status) return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  
  switch (status.toLowerCase()) {
    case "active":
    case "assigned":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "inactive":
    case "unassigned":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    case "maintenance":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "broken":
    case "lost":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "expired":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  }
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [expandedDevices, setExpandedDevices] = useState<Set<number>>(new Set());

  const toggleDeviceExpansion = (deviceId: number) => {
    const newExpanded = new Set(expandedDevices);
    if (newExpanded.has(deviceId)) {
      newExpanded.delete(deviceId);
    } else {
      newExpanded.add(deviceId);
    }
    setExpandedDevices(newExpanded);
  };

  const formatCurrency = (cents: number | null) => {
    if (!cents) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const { data: assignedDevices = [], isLoading: devicesLoading, refetch } = useQuery<AssignedDevice[]>({
    queryKey: ['/api/devices/assigned', user?.id],
    enabled: !!user?.id,
  });





  const { data: assignedSoftware = [], isLoading: softwareLoading } = useQuery<AssignedSoftware[]>({
    queryKey: [`/api/software-assignments/user/${user?.id}`],
    enabled: !!user?.id,
  });

  if (devicesLoading || softwareLoading) {
    return (
      <PageContainer title="My Dashboard" description="Loading your assignments...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your assignments...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="My Dashboard" description="View your assigned devices and software licenses">
      <div className="space-y-6">

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                {assignedSoftware.filter(s => {
                  if (!s.expiryDate) return false;
                  const expiry = new Date(s.expiryDate);
                  const thirtyDaysFromNow = new Date();
                  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                  return expiry <= thirtyDaysFromNow;
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <span>My Devices</span>
            </CardTitle>
            <CardDescription>
              Devices currently assigned to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!Array.isArray(assignedDevices) || assignedDevices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No devices assigned to you</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedDevices.map((device) => {
                  const isExpanded = expandedDevices.has(device.id);
                  return (
                    <div key={device.id} className="border rounded-lg p-4 space-y-3">
                      {/* Device Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{device.name || `${device.brand} ${device.model}`}</h3>
                            <Badge className={getStatusColor(device.status)}>
                              {device.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {device.brand} {device.model}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDeviceExpansion(device.id)}
                          className="ml-2"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {/* Basic Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {device.assetTag && (
                          <div className="flex items-center space-x-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Asset Tag:</span>
                            <span className="font-medium">{device.assetTag}</span>
                          </div>
                        )}
                        
                        {device.serialNumber && (
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">Serial:</span>
                            <span className="font-mono text-xs bg-muted px-1 rounded">{device.serialNumber}</span>
                          </div>
                        )}
                        
                        {device.category && (
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">Category:</span>
                            <span>{device.category.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Assignment Information */}
                      {device.assignedAt && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <div className="flex items-center space-x-2 text-sm">
                            <UserCheck className="h-4 w-4 text-green-600" />
                            <span className="text-green-700 dark:text-green-400 font-medium">
                              Assigned to you on {formatDate(device.assignedAt)}
                            </span>
                          </div>
                          {device.assignmentNotes && (
                            <p className="text-sm text-muted-foreground mt-2 pl-6">
                              {device.assignmentNotes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="space-y-4 pt-2 border-t">
                          {/* Technical Specifications */}
                          {device.specs && (() => {
                            try {
                              const specs = typeof device.specs === 'string' ? JSON.parse(device.specs) : device.specs;
                              const hasSpecs = specs && typeof specs === 'object' && Object.keys(specs).length > 0;
                              
                              if (!hasSpecs) return null;
                              
                              return (
                                <div>
                                  <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                                    <Cpu className="h-4 w-4" />
                                    <span>Technical Specifications</span>
                                  </h4>
                                  <div className="grid grid-cols-1 gap-2 text-sm">
                                    {Object.entries(specs).map(([key, value]) => {
                                      if (!value || value.toString().trim() === '') return null;
                                      
                                      // Get appropriate icon for the spec field
                                      const getIconForField = (fieldName: string) => {
                                        const field = fieldName.toLowerCase();
                                        if (field.includes('processor') || field.includes('cpu')) return <Cpu className="h-4 w-4 text-muted-foreground mt-0.5" />;
                                        if (field.includes('memory') || field.includes('ram')) return <MemoryStick className="h-4 w-4 text-muted-foreground mt-0.5" />;
                                        if (field.includes('storage') || field.includes('disk')) return <HardDrive className="h-4 w-4 text-muted-foreground mt-0.5" />;
                                        if (field.includes('graphics') || field.includes('gpu')) return <Eye className="h-4 w-4 text-muted-foreground mt-0.5" />;
                                        if (field.includes('display') || field.includes('screen')) return <Monitor className="h-4 w-4 text-muted-foreground mt-0.5" />;
                                        if (field.includes('connectivity') || field.includes('wifi') || field.includes('network')) return <Wifi className="h-4 w-4 text-muted-foreground mt-0.5" />;
                                        return <Settings className="h-4 w-4 text-muted-foreground mt-0.5" />;
                                      };

                                      // Format field name for display
                                      const formatFieldName = (fieldName: string) => {
                                        return fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
                                      };

                                      return (
                                        <div key={key} className="flex items-start space-x-2">
                                          {getIconForField(key)}
                                          <div>
                                            <span className="text-muted-foreground font-medium">{formatFieldName(key)}</span>
                                            <div className="text-foreground">{value.toString()}</div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            } catch (e) {
                              return null;
                            }
                          })()}

                          {/* Location & Management */}
                          <div>
                            <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                              <Building2 className="h-4 w-4" />
                              <span>Location & Management</span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {device.site && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-muted-foreground font-medium">Site:</span>
                                  <span>{device.site.name}</span>
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

                          {/* Financial Information */}
                          {(device.purchaseCost || device.purchaseDate) && (
                            <div>
                              <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                                <DollarSign className="h-4 w-4" />
                                <span>Financial Information</span>
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                {device.purchaseCost && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-muted-foreground font-medium">Purchase Cost:</span>
                                    <span className="font-medium">{formatCurrency(device.purchaseCost)}</span>
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

                          {/* Notes */}
                          {device.notes && (
                            <div>
                              <h4 className="font-medium text-sm mb-2">Notes</h4>
                              <p className="text-sm text-muted-foreground">{device.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Software */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>My Software</span>
            </CardTitle>
            <CardDescription>
              Software licenses assigned to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!Array.isArray(assignedSoftware) || assignedSoftware.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No software licenses assigned to you</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedSoftware.map((assignment) => (
                  <div key={assignment.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium">{assignment.software.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {assignment.software.vendor} {assignment.software.version && `• ${assignment.software.version}`}
                        </p>
                      </div>
                      <Badge className={getStatusColor(assignment.software.status)}>
                        {assignment.software.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-muted-foreground font-medium">License Type:</span>
                        <div>{assignment.software.licenseType}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">Assigned:</span>
                        <div>{formatDate(assignment.assignmentDate)}</div>
                      </div>
                      {assignment.expiryDate && (
                        <div>
                          <span className="text-muted-foreground font-medium">Expires:</span>
                          <div>{formatDate(assignment.expiryDate)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}