import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/layout/PageContainer';
import { 
  Package, 
  Calendar, 
  Building2, 
  User, 
  FileText, 
  ExternalLink,
  Monitor,
  Loader2
} from 'lucide-react';

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
    icon?: string | null;
  };
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'No expiry date';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
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
    case 'expired':
      return 'bg-red-100 text-red-800';
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

export default function GuestSoftware() {
  const { user } = useAuth();

  const { data: assignedSoftware = [], isLoading } = useQuery<AssignedSoftware[]>({
    queryKey: [`/api/software-assignments/user/${user?.id}`],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <PageContainer title="Software &amp; Portals">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-2 text-muted-foreground">Loading software...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (assignedSoftware.length === 0) {
    return (
      <PageContainer title="Software &amp; Portals">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Software Assigned</h3>
            <p className="text-muted-foreground text-center">
              You don't have any software licenses or portal access assigned to you at the moment.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Software &amp; Portals">
      <div className="space-y-6">
        {assignedSoftware.map((assignment) => (
          <Card key={assignment.id} className="overflow-hidden">
            <CardHeader className="pb-3 px-4 md:px-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-2 sm:space-y-0">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 flex-wrap">
                    {assignment.software.icon ? (
                      <img
                        src={assignment.software.icon}
                        alt={`${assignment.software.name} icon`}
                        className="h-5 w-5 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <Package className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                    <span className="break-words">{assignment.software.name}</span>
                    {assignment.software.url && (
                      <a
                        href={assignment.software.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                        title="Open software website"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-words">{assignment.software.vendor}</span>
                      {assignment.software.version && (
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          v{assignment.software.version}
                        </span>
                      )}
                    </div>
                  </CardDescription>
                </div>
                <Badge className={`${getStatusColor(assignment.software.status || 'active')} mt-2 sm:mt-0 self-start`}>
                  {formatStatus(assignment.software.status)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-0 px-4 md:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* License Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    License Information
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground min-w-[80px] flex-shrink-0">Type:</span>
                      <span className="text-sm break-words">{assignment.software.licenseType}</span>
                    </div>
                    
                    {assignment.software.expiryDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-muted-foreground min-w-[80px] flex-shrink-0">Expires:</span>
                        <span className="text-sm">{formatDate(assignment.software.expiryDate)}</span>
                      </div>
                    )}
                    
                    {assignment.licenseKey && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium text-muted-foreground min-w-[80px] mt-0.5 flex-shrink-0">License Key:</span>
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded break-all">
                          {assignment.licenseKey}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assignment Details
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium text-muted-foreground min-w-[80px] flex-shrink-0">Assigned:</span>
                      <span className="text-sm">{formatDate(assignment.assignedAt)}</span>
                    </div>
                    
                    {assignment.deviceAssetTag && (
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-muted-foreground min-w-[80px] flex-shrink-0">Device:</span>
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded break-all">
                          #{assignment.deviceAssetTag}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Information
                  </h3>
                  
                  <div className="space-y-3">
                    {assignment.software.url && (
                      <div className="flex items-start gap-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-muted-foreground">Website:</span>
                          <div className="mt-1">
                            <a
                              href={assignment.software.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline break-all"
                            >
                              {assignment.software.url}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {assignment.notes && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-muted-foreground">Notes:</span>
                          <p className="text-sm mt-1 text-muted-foreground leading-relaxed">
                            {assignment.notes}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {!assignment.software.url && !assignment.notes && (
                      <p className="text-sm text-muted-foreground">No additional information available</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}