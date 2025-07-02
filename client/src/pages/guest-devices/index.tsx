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
      <div className="space-y-3">
        {assignedDevices.map((device) => {
          // Parse specs if available
          let parsedSpecs: any = null;
          if (device.specs) {
            try {
              parsedSpecs = JSON.parse(device.specs);
            } catch (e) {
              console.warn(`Failed to parse specs for device ${device.id}:`, e);
            }
          }

          return (
            <Card key={device.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 items-start">
                  
                  {/* Device Info */}
                  <div className="md:col-span-2 lg:col-span-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base">
                        {device.brand} {device.model}
                      </h3>
                      <Badge className={getStatusColor(device.status)}>
                        {formatStatus(device.status)}
                      </Badge>
                    </div>
                    {device.assetTag && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-mono text-muted-foreground">#{device.assetTag}</span>
                      </div>
                    )}
                    {device.serialNumber && (
                      <div className="text-xs text-muted-foreground font-mono">
                        SN: {device.serialNumber}
                      </div>
                    )}
                  </div>

                  {/* Specifications */}
                  <div className="lg:col-span-1 space-y-1">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Specs</h4>
                    <div className="space-y-1">
                      {parsedSpecs ? (
                        <>
                          {parsedSpecs.ram && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">RAM:</span> {parsedSpecs.ram}
                            </div>
                          )}
                          {parsedSpecs.storage && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Storage:</span> {parsedSpecs.storage}
                            </div>
                          )}
                          {parsedSpecs.graphics && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Graphics:</span> {parsedSpecs.graphics}
                            </div>
                          )}
                          {parsedSpecs.display && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Display:</span> {parsedSpecs.display}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">No specs available</div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="lg:col-span-1 space-y-1">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</h4>
                    <div className="space-y-1">
                      {device.site && (
                        <div className="text-xs">
                          <Building2 className="inline h-3 w-3 mr-1 text-muted-foreground" />
                          {device.site.name}
                        </div>
                      )}
                      {device.address && (
                        <div className="text-xs text-muted-foreground">
                          {device.address}
                        </div>
                      )}
                      <div className="text-xs">
                        <Calendar className="inline h-3 w-3 mr-1 text-muted-foreground" />
                        <span className="text-muted-foreground">Assigned:</span> {formatDate(device.assignedAt)}
                      </div>
                    </div>
                  </div>

                  {/* Financial */}
                  <div className="lg:col-span-1 space-y-1">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Financial</h4>
                    <div className="space-y-1">
                      {device.purchaseCost !== null && (
                        <div className="text-xs">
                          <DollarSign className="inline h-3 w-3 mr-1 text-muted-foreground" />
                          {formatCurrency(device.purchaseCost)}
                        </div>
                      )}
                      {device.purchaseDate && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Purchased:</span> {formatDate(device.purchaseDate)}
                        </div>
                      )}
                      {device.warrantyEOL && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Warranty:</span> {formatDate(device.warrantyEOL)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {device.notes && (
                    <div className="md:col-span-4 lg:col-span-1 space-y-1">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</h4>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {device.notes}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}