import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageContainer } from "@/components/layout/PageContainer";
import { Monitor, Package, Calendar, Tag, User, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface AssignedDevice {
  id: number;
  name: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  assetTag: string | null;
  status: string;
  purchaseDate: Date | null;
  warrantyEOL: Date | null;
  category: {
    name: string;
  } | null;
  site: {
    name: string;
  } | null;
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
  if (!date) return "N/A";
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString();
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
    case "assigned":
      return "bg-green-100 text-green-800";
    case "inactive":
    case "unassigned":
      return "bg-gray-100 text-gray-800";
    case "maintenance":
      return "bg-yellow-100 text-yellow-800";
    case "broken":
    case "lost":
      return "bg-red-100 text-red-800";
    case "expired":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
}

export default function UserDashboard() {
  const { user } = useAuth();

  const { data: assignedDevices = [], isLoading: devicesLoading } = useQuery<AssignedDevice[]>({
    queryKey: ['/api/devices/assigned', user?.id],
    enabled: !!user?.id,
  });

  const { data: assignedSoftware = [], isLoading: softwareLoading } = useQuery<AssignedSoftware[]>({
    queryKey: ['/api/software-assignments/user', user?.id],
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
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Array.isArray(assignedDevices) ? assignedDevices.filter(d => d.status?.toLowerCase() === 'assigned').length : 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Software</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Array.isArray(assignedSoftware) ? assignedSoftware.filter(s => s.software?.status?.toLowerCase() === 'active').length : 0}
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
                {assignedDevices.map((device) => (
                  <div key={device.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium">{device.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {device.brand} {device.model}
                        </p>
                      </div>
                      <Badge className={getStatusColor(device.status)}>
                        {device.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {device.assetTag && (
                        <div className="flex items-center space-x-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Asset:</span>
                          <span>{device.assetTag}</span>
                        </div>
                      )}
                      
                      {device.serialNumber && (
                        <div className="flex items-center space-x-2">
                          <span className="text-muted-foreground">Serial:</span>
                          <span className="font-mono text-xs">{device.serialNumber}</span>
                        </div>
                      )}
                      
                      {device.category && (
                        <div className="flex items-center space-x-2">
                          <span className="text-muted-foreground">Category:</span>
                          <span>{device.category.name}</span>
                        </div>
                      )}
                      
                      {device.site && (
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Site:</span>
                          <span>{device.site.name}</span>
                        </div>
                      )}
                    </div>
                    
                    {(device.purchaseDate || device.warrantyEOL) && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {device.purchaseDate && (
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Purchased:</span>
                              <span>{formatDate(device.purchaseDate)}</span>
                            </div>
                          )}
                          
                          {device.warrantyEOL && (
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Warranty:</span>
                              <span>{formatDate(device.warrantyEOL)}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
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
                  <div key={assignment.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium">{assignment.software.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {assignment.software.vendor}
                          {assignment.software.version && ` v${assignment.software.version}`}
                        </p>
                      </div>
                      <Badge className={getStatusColor(assignment.software.status)}>
                        {assignment.software.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground">License Type:</span>
                        <span>{assignment.software.licenseType}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Assigned:</span>
                        <span>{formatDate(assignment.assignmentDate)}</span>
                      </div>
                      
                      {assignment.expiryDate && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Expires:</span>
                          <span>{formatDate(assignment.expiryDate)}</span>
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