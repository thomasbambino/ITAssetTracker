import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/PageContainer";
import { formatDate, formatCurrency, mapErrorMessage } from "@/lib/utils";
import { SoftwareForm } from "@/components/forms/SoftwareForm";
import { SoftwareAssignmentForm } from "@/components/forms/SoftwareAssignmentForm";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AlertCircle, Bell, Calendar, CheckCircle, Clock, CreditCard, Edit as EditIcon, Mail, Monitor, Plus, Tag, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/ui/data-table";

// Define the software type
interface Software {
  id: number;
  name: string;
  vendor: string;
  licenseKey?: string | null;
  purchaseDate?: Date | null;
  expiryDate?: Date | null;
  licenseType: string;
  seats?: number | null;
  cost?: number | null;
  status: "active" | "expired" | "pending";
  notes?: string | null;
  version?: string | null;
  sendAccessNotifications?: boolean | null;
  notificationEmail?: string | null;
}

// Define the software assignment type
interface SoftwareAssignment {
  id: number;
  softwareId: number;
  userId?: number | null;
  deviceId?: number | null;
  assignedAt: string; // API returns this as a string ISO date
  assignedBy: number | null;
  expiryDate?: string | null;
  notes?: string | null;
  userName?: string | null; // Flat field from the API
  softwareName?: string | null;
  deviceAssetTag?: string | null;
  user?: {
    id: number;
    name?: string; // Matches the actual API response
    firstName?: string; // For backward compatibility
    lastName?: string; // For backward compatibility
    email?: string;
    department?: string | null;
  } | null;
  device?: {
    id: number;
    name?: string | null;
    brand: string;
    model: string;
    assetTag: string;
  } | null;
  assignor?: {
    id: number;
    name: string;
  } | null;
  software?: {
    id: number;
    name: string;
    vendor: string;
    licenseType: string;
    status: string;
    expiryDate?: string | null;
  } | null;
}

export default function SoftwareDetails() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const softwareId = Number(params.id);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const { toast } = useToast();

  // Query to fetch software details
  const { data: software, isLoading: isSoftwareLoading } = useQuery<Software>({
    queryKey: [`/api/software/${softwareId}`],
    enabled: !!softwareId && !isNaN(softwareId),
  });

  // Query to fetch software assignments
  const { data: assignments = [], isLoading: isAssignmentsLoading, refetch: refetchAssignments } = useQuery<SoftwareAssignment[]>({
    queryKey: [`/api/software/${softwareId}/assignments`],
    enabled: !!softwareId && !isNaN(softwareId),
  });
  
  // Mutation to delete a software assignment
  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      return apiRequest({
        url: `/api/software-assignments/${assignmentId}`,
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Assignment removed",
        description: "The software assignment has been removed successfully.",
      });
      // Refetch assignments after deletion
      refetchAssignments();
      // Also invalidate activity logs so they update in real-time
      queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: mapErrorMessage(error) || "Failed to remove assignment. Please try again.",
      });
    }
  });

  // Redirect to software list if ID is invalid
  useEffect(() => {
    if (!isNaN(softwareId) && softwareId <= 0) {
      setLocation('/software');
    }
  }, [softwareId, setLocation]);

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/software', softwareId] });
    // Also invalidate activity logs so they update in real-time
    queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
  };

  const handleAssignSuccess = () => {
    setIsAssignDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: [`/api/software/${softwareId}/assignments`] });
    // Also invalidate activity logs so they update in real-time
    queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
  };

  // Generate status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
      active: { 
        label: "Active", 
        icon: <CheckCircle className="h-4 w-4 mr-1" />, 
        className: "bg-green-100 text-green-800 border-green-200" 
      },
      expired: { 
        label: "Expired", 
        icon: <AlertCircle className="h-4 w-4 mr-1" />, 
        className: "bg-red-100 text-red-800 border-red-200" 
      },
      pending: { 
        label: "Pending", 
        icon: <Clock className="h-4 w-4 mr-1" />, 
        className: "bg-yellow-100 text-yellow-800 border-yellow-200" 
      },
    };
    
    const statusInfo = statusMap[status] || statusMap.pending;
    
    return (
      <Badge 
        variant="outline" 
        className={`flex items-center px-3 py-1 font-medium border-0 ${statusInfo.className}`}
      >
        {statusInfo.icon}
        {statusInfo.label}
      </Badge>
    );
  };

  // Assignments table columns
  const assignmentColumns = [
    {
      header: "Assigned To",
      accessor: (assignment: SoftwareAssignment) => {
        if (assignment.user) {
          // Handle both the new API format (name) and potential old format (firstName/lastName)
          if (assignment.user.name) {
            return assignment.user.name;
          } else if (assignment.user.firstName && assignment.user.lastName) {
            return `${assignment.user.firstName} ${assignment.user.lastName}`;
          } else {
            return assignment.userName || 'Unknown User';
          }
        } else if (assignment.device) {
          return `${assignment.device.brand} ${assignment.device.model} (${assignment.device.assetTag})`;
        }
        return 'Unassigned';
      },
      cell: (assignment: SoftwareAssignment) => {
        if (assignment.user) {
          let displayName = 'Unknown User';
          if (assignment.user.name) {
            displayName = assignment.user.name;
          } else if (assignment.user.firstName && assignment.user.lastName) {
            displayName = `${assignment.user.firstName} ${assignment.user.lastName}`;
          } else if (assignment.userName) {
            displayName = assignment.userName;
          }
          
          return (
            <button 
              className="text-primary hover:underline focus:outline-none"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the row click
                setLocation(`/users/${assignment.user!.id}`);
              }}
            >
              {displayName}
            </button>
          );
        } else if (assignment.device) {
          return (
            <button
              className="text-primary hover:underline focus:outline-none"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the row click
                setLocation(`/devices/${assignment.device!.id}`);
              }}
            >
              {assignment.device.brand} {assignment.device.model} ({assignment.device.assetTag})
            </button>
          );
        }
        return 'Unassigned';
      },
    },
    {
      header: "Type",
      accessor: (assignment: SoftwareAssignment) => assignment.user ? 'User' : 'Device',
      cell: (assignment: SoftwareAssignment) => {
        const isUser = assignment.user !== null && assignment.user !== undefined;
        const className = isUser 
          ? "bg-blue-100 text-blue-800 border-blue-200" 
          : "bg-purple-100 text-purple-800 border-purple-200";
        
        return (
          <div className="flex">
            <Badge 
              variant="outline" 
              className={`flex items-center px-3 py-1 border-0 min-w-[90px] justify-center font-medium ${className}`}
            >
              {isUser ? <Users className="h-4 w-4 mr-1" /> : <Monitor className="h-4 w-4 mr-1" />}
              {isUser ? 'User' : 'Device'}
            </Badge>
          </div>
        );
      },
    },
    {
      header: "Assignment Date",
      accessor: (assignment: SoftwareAssignment) => formatDate(assignment.assignedAt),
    },
    {
      header: "Expiry Date",
      accessor: (assignment: SoftwareAssignment) => assignment.expiryDate ? formatDate(assignment.expiryDate) : 'N/A',
    },
  ];

  // Page actions
  const pageActions = (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsEditDialogOpen(true)}
        disabled={isSoftwareLoading}
      >
        <EditIcon className="h-4 w-4 mr-2" /> Edit
      </Button>
      <Button 
        onClick={() => setIsAssignDialogOpen(true)}
        disabled={isSoftwareLoading}
      >
        <Plus className="h-4 w-4 mr-2" /> Assign
      </Button>
    </>
  );

  if (isSoftwareLoading) {
    return (
      <PageContainer 
        title="Software Details" 
        description="Loading software information..."
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    );
  }

  if (!software) {
    return (
      <PageContainer 
        title="Software Not Found" 
        description="The requested software could not be found."
      >
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <h3 className="text-lg font-medium">Software not found</h3>
              <p className="text-muted-foreground mb-4">The software you're looking for doesn't exist or has been removed.</p>
              <Button onClick={() => setLocation('/software')}>Return to Software List</Button>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title={software.name} 
      description={`Software license details for ${software.name} by ${software.vendor}`}
      actions={pageActions}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Software Details Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{software.name}</CardTitle>
                <CardDescription>{software.vendor}</CardDescription>
              </div>
              <div>{getStatusBadge(software.status)}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center mb-1">
                  <Tag className="h-4 w-4 mr-1" /> License Type
                </span>
                <span className="font-medium">{software.licenseType}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center mb-1">
                  <Users className="h-4 w-4 mr-1" /> Seats
                </span>
                <span className="font-medium">{software.seats || 'N/A'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center mb-1">
                  <CreditCard className="h-4 w-4 mr-1" /> Cost
                </span>
                <span className="font-medium">{software.cost ? formatCurrency(software.cost) : 'N/A'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center mb-1">
                  <Calendar className="h-4 w-4 mr-1" /> Purchase Date
                </span>
                <span className="font-medium">{software.purchaseDate ? formatDate(software.purchaseDate) : 'N/A'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center mb-1">
                  <Calendar className="h-4 w-4 mr-1" /> Expiry Date
                </span>
                <span className="font-medium">{software.expiryDate ? formatDate(software.expiryDate) : 'N/A'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center mb-1">
                  <Tag className="h-4 w-4 mr-1" /> Version
                </span>
                <span className="font-medium">{software.version || 'N/A'}</span>
              </div>
            </div>
            
            {software.licenseKey && (
              <div>
                <h3 className="font-medium mb-1">License Key</h3>
                <p className="p-2 bg-muted rounded-md text-sm font-mono break-all">
                  {software.licenseKey}
                </p>
              </div>
            )}
            
            {software.notes && (
              <div>
                <h3 className="font-medium mb-1">Notes</h3>
                <p className="text-sm">{software.notes}</p>
              </div>
            )}
            
            {/* Notification Settings */}
            <div className="border rounded-md p-4 bg-muted/10">
              <h3 className="font-medium mb-2 flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Notification Settings
              </h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-2 ${software.sendAccessNotifications ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">
                    {software.sendAccessNotifications ? 'Email notifications are enabled' : 'Email notifications are disabled'}
                  </span>
                </div>
                {software.sendAccessNotifications && software.notificationEmail && (
                  <div className="text-sm flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground">{software.notificationEmail}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Software Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
              <span className="text-sm font-medium">Total Assignments</span>
              <Badge variant="secondary" className="text-lg">{assignments.length}</Badge>
            </div>
            
            {software.seats ? (
              <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                <span className="text-sm font-medium">Available Seats</span>
                <Badge variant="secondary" className="text-lg">
                  {software.seats - assignments.length > 0 ? software.seats - assignments.length : 0} / {software.seats}
                </Badge>
              </div>
            ) : null}

            <div className="flex flex-col p-3 bg-primary/5 rounded-lg">
              <span className="text-sm font-medium mb-1">Assignment Types</span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex flex-col items-center p-2 bg-background rounded-md">
                  <span className="text-xl font-bold">
                    {assignments.filter(a => a.userId).length}
                  </span>
                  <span className="text-xs text-muted-foreground">Users</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-background rounded-md">
                  <span className="text-xl font-bold">
                    {assignments.filter(a => a.deviceId).length}
                  </span>
                  <span className="text-xs text-muted-foreground">Devices</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Assignments Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>Current assignments of this software</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={assignments}
            columns={assignmentColumns}
            keyField="id"
            loading={isAssignmentsLoading}
            searchable
            // Remove onRowClick functionality to prevent navigation conflicts with the buttons
            actions={[
              {
                label: "Remove",
                icon: <Trash2 className="h-4 w-4" />,
                onClick: (assignment: SoftwareAssignment) => {
                  if (confirm(`Are you sure you want to remove this assignment?`)) {
                    deleteMutation.mutate(assignment.id);
                  }
                }
              }
            ]}
            emptyState={
              <div className="text-center py-10">
                <p className="text-muted-foreground">No assignments found for this software.</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsAssignDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Assign to User or Device
                </Button>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Edit Software Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Software</DialogTitle>
            <DialogDescription>
              Update details for {software.name}
            </DialogDescription>
          </DialogHeader>
          <SoftwareForm 
            software={software} 
            onSuccess={handleEditSuccess} 
          />
        </DialogContent>
      </Dialog>

      {/* Assign Software Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Software</DialogTitle>
            <DialogDescription>
              Assign {software.name} to a user or device
            </DialogDescription>
          </DialogHeader>
          <SoftwareAssignmentForm 
            softwareId={software.id} 
            onSuccess={handleAssignSuccess} 
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}