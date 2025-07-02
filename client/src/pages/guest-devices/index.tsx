import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/layout/PageContainer';
import { 
  Monitor, 
  Calendar, 
  Cpu, 
  HardDrive, 
  Building2, 
  DollarSign, 
  FileText, 
  Tag,
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

function formatDate(date: Date | string | null): string {
  if (!date) return 'Not specified';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Not specified';
  // Convert from cents to dollars
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

export default function GuestDevices() {
  const { user } = useAuth();

  const { data: assignedDevices = [], isLoading } = useQuery<AssignedDevice[]>({
    queryKey: [`/api/devices/assigned`],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <PageContainer title="My Devices">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading devices...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (assignedDevices.length === 0) {
    return (
      <PageContainer title="My Devices">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Devices Assigned</h3>
            <p className="text-muted-foreground text-center">
              You don't have any devices assigned to you at the moment.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="My Devices">
      <div className="space-y-6">
        {assignedDevices.map((device) => {
          // Specs are already parsed objects from the API, no need to JSON.parse
          let parsedSpecs: any = null;
          if (device.specs) {
            // If specs is already an object, use it directly
            if (typeof device.specs === 'object') {
              parsedSpecs = device.specs;
            } else {
              // If it's a string, try to parse it
              try {
                parsedSpecs = JSON.parse(device.specs);
              } catch (e) {
                console.warn(`Failed to parse specs for device ${device.id}:`, e);
              }
            }
            console.log(`Device ${device.id} (${device.brand} ${device.model}) specs:`, parsedSpecs);
          } else {
            console.log(`Device ${device.id} (${device.brand} ${device.model}) has no specs`);
          }

          return (
            <Card key={device.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl font-bold">
                      {device.brand} {device.model}
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                      {device.assetTag && (
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          #{device.assetTag}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(device.status)}>
                    {formatStatus(device.status)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Device Specifications */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      Device Specifications
                    </h3>
                    
                    <div className="space-y-3">
                      {parsedSpecs && Object.keys(parsedSpecs).length > 0 ? (
                        <>
                          {/* Display RAM - try multiple field names */}
                          {(parsedSpecs.ram || parsedSpecs.RAM || parsedSpecs.memory) && (
                            <div className="flex items-start gap-3">
                              <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">RAM:</span>
                              <span className="text-sm">{parsedSpecs.ram || parsedSpecs.RAM || parsedSpecs.memory}</span>
                            </div>
                          )}
                          
                          {/* Display Storage */}
                          {(parsedSpecs.storage || parsedSpecs.Storage) && (
                            <div className="flex items-start gap-3">
                              <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">Storage:</span>
                              <span className="text-sm">{parsedSpecs.storage || parsedSpecs.Storage}</span>
                            </div>
                          )}
                          
                          {/* Display Graphics */}
                          {(parsedSpecs.graphics || parsedSpecs.Graphics) && (
                            <div className="flex items-start gap-3">
                              <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">Graphics:</span>
                              <span className="text-sm">{parsedSpecs.graphics || parsedSpecs.Graphics}</span>
                            </div>
                          )}
                          
                          {/* Display Display/Screen */}
                          {(parsedSpecs.display || parsedSpecs.Display || parsedSpecs.screen) && (
                            <div className="flex items-start gap-3">
                              <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">Display:</span>
                              <span className="text-sm">{parsedSpecs.display || parsedSpecs.Display || parsedSpecs.screen}</span>
                            </div>
                          )}
                          
                          {/* Show other specs that don't fit the main categories */}
                          {Object.entries(parsedSpecs).map(([key, value]) => {
                            // Skip the main spec fields we already displayed
                            const mainFields = ['ram', 'RAM', 'memory', 'storage', 'Storage', 'graphics', 'Graphics', 'display', 'Display', 'screen'];
                            if (mainFields.includes(key) || !value) return null;
                            
                            // Format key with special handling for CPU and OS
                            let displayKey = key.replace(/([A-Z])/g, ' $1').trim();
                            if (key.toLowerCase() === 'cpu') {
                              displayKey = 'CPU';
                            } else if (key.toLowerCase() === 'os') {
                              displayKey = 'OS';
                            } else {
                              displayKey = displayKey.charAt(0).toUpperCase() + displayKey.slice(1).toLowerCase();
                            }
                            
                            return (
                              <div key={key} className="flex items-start gap-3">
                                <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">
                                  {displayKey}:
                                </span>
                                <span className="text-sm">{value}</span>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No specifications available</p>
                      )}
                      
                      {device.serialNumber && (
                        <div className="flex items-start gap-3 pt-2 border-t">
                          <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">Serial:</span>
                          <span className="text-sm font-mono">{device.serialNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location & Management */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Location & Management
                    </h3>
                    
                    <div className="space-y-3">
                      {device.site && (
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">Site:</span>
                          <span className="text-sm">{device.site.name}</span>
                        </div>
                      )}
                      
                      {device.address && (
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">Address:</span>
                          <span className="text-sm">{device.address}</span>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">Assigned:</span>
                        <span className="text-sm">{formatDate(device.assignedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Warranty */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Financial & Warranty
                    </h3>
                    
                    <div className="space-y-3">
                      {device.purchaseCost !== null && (
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">Cost:</span>
                          <span className="text-sm">{formatCurrency(device.purchaseCost)}</span>
                        </div>
                      )}
                      
                      {device.purchaseDate && (
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">Purchased:</span>
                          <span className="text-sm">{formatDate(device.purchaseDate)}</span>
                        </div>
                      )}
                      
                      {device.warrantyEOL && (
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">Warranty:</span>
                          <span className="text-sm">{formatDate(device.warrantyEOL)}</span>
                        </div>
                      )}
                    </div>

                    {device.notes && (
                      <div className="pt-3 border-t">
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">Notes:</span>
                          <p className="text-sm text-muted-foreground leading-relaxed">{device.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}