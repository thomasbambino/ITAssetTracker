import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { Monitor, Package, Calendar, Tag, User, Building2, Cpu, HardDrive, MemoryStick, DollarSign, Clock, UserCheck, FileText, ChevronDown, ChevronUp } from "lucide-react";
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
  if (!date) return "N/A";
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString();
}

function getStatusColor(status: string | null | undefined): string {
  if (!status) return "bg-gray-100 text-gray-800";
  
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

  const { data: assignedDevices = [], isLoading: devicesLoading } = useQuery<AssignedDevice[]>({
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
                              const hasSpecs = specs && Object.values(specs).some(value => value && value.toString().trim());
                              
                              if (!hasSpecs) return null;
                              
                              return (
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                                    <Cpu className="h-4 w-4" />
                                    <span>Technical Specifications</span>
                                  </h4>
                                  <div className="grid grid-cols-1 gap-3 text-sm">
                                    {specs.processor && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Processor:</span>
                                        <div className="text-foreground">{specs.processor}</div>
                                      </div>
                                    )}
                                    {specs.memory && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Memory:</span>
                                        <div className="text-foreground">{specs.memory}</div>
                                      </div>
                                    )}
                                    {specs.storage && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Storage:</span>
                                        <div className="text-foreground">{specs.storage}</div>
                                      </div>
                                    )}
                                    {specs.graphics && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Graphics:</span>
                                        <div className="text-foreground">{specs.graphics}</div>
                                      </div>
                                    )}
                                    {specs.display && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Display:</span>
                                        <div className="text-foreground">{specs.display}</div>
                                      </div>
                                    )}
                                    {specs.connectivity && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Connectivity:</span>
                                        <div className="text-foreground">{specs.connectivity}</div>
                                      </div>
                                    )}
                                    {specs.ports && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Ports:</span>
                                        <div className="text-foreground">{specs.ports}</div>
                                      </div>
                                    )}
                                    {specs.battery && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Battery:</span>
                                        <div className="text-foreground">{specs.battery}</div>
                                      </div>
                                    )}
                                    {specs.weight && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Weight:</span>
                                        <div className="text-foreground">{specs.weight}</div>
                                      </div>
                                    )}
                                    {specs.features && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Features:</span>
                                        <div className="text-foreground">{specs.features}</div>
                                      </div>
                                    )}
                                    {specs.form_factor && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Form Factor:</span>
                                        <div className="text-foreground">{specs.form_factor}</div>
                                      </div>
                                    )}
                                    {specs.dimensions && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Dimensions:</span>
                                        <div className="text-foreground">{specs.dimensions}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            } catch (e) {
                              return null;
                            }
                          })()}

                          {/* Location & Management */}
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                              <Building2 className="h-4 w-4" />
                              <span>Location & Management</span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {device.site && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-muted-foreground">Site:</span>
                                  <span>{device.site.name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Financial Information */}
                          {(device.purchaseCost || device.purchaseDate) && (
                            <div>
                              <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                                <DollarSign className="h-4 w-4" />
                                <span>Financial Information</span>
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {device.purchaseCost && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-muted-foreground">Purchase Cost:</span>
                                    <span className="font-medium">{formatCurrency(device.purchaseCost)}</span>
                                  </div>
                                )}
                                {device.purchaseDate && (
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Purchase Date:</span>
                                    <span>{formatDate(device.purchaseDate)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Warranty & Support */}
                          {device.warrantyEOL && (
                            <div>
                              <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span>Warranty & Support</span>
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="text-muted-foreground">Warranty Expires:</span>
                                  <span className={new Date(device.warrantyEOL) < new Date() ? 'text-red-600 font-medium' : ''}>{formatDate(device.warrantyEOL)}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {device.notes && (
                            <div>
                              <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                                <FileText className="h-4 w-4" />
                                <span>Notes</span>
                              </h4>
                              <div className="bg-muted p-3 rounded text-sm">
                                {device.notes}
                              </div>
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