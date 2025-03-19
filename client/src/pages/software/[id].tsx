import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/PageContainer";
import { formatDate, formatCurrency } from "@/lib/utils";
import { SoftwareForm } from "@/components/forms/SoftwareForm";
import { SoftwareAssignmentForm } from "@/components/forms/SoftwareAssignmentForm";
import { queryClient } from "@/lib/queryClient";
import { AlertCircle, Calendar, CheckCircle, Clock, CreditCard, Edit as EditIcon, Plus, Tag, Users } from "lucide-react";
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
}

// Define the software assignment type
interface SoftwareAssignment {
  id: number;
  softwareId: number;
  userId?: number | null;
  deviceId?: number | null;
  assignmentDate: Date;
  expiryDate?: Date | null;
  notes?: string | null;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    department?: string | null;
  } | null;
  device?: {
    id: number;
    brand: string;
    model: string;
    assetTag: string;
  } | null;
}

export default function SoftwareDetails() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const softwareId = Number(params.id);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // Query to fetch software details
  const { data: software, isLoading: isSoftwareLoading } = useQuery<Software>({
    queryKey: [`/api/software/${softwareId}`],
    enabled: !!softwareId && !isNaN(softwareId),
  });

  // Query to fetch software assignments
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery<SoftwareAssignment[]>({
    queryKey: [`/api/software-assignments/software/${softwareId}`],
    enabled: !!softwareId && !isNaN(softwareId),
  });

  // Redirect to software list if ID is invalid
  useEffect(() => {
    if (!isNaN(softwareId) && softwareId <= 0) {
      setLocation('/software');
    }
  }, [softwareId, setLocation]);

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: [`/api/software/${softwareId}`] });
  };

  const handleAssignSuccess = () => {
    setIsAssignDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: [`/api/software-assignments/software/${softwareId}`] });
  };

  // Generate status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; icon: React.ReactNode; class: string }> = {
      active: { label: "Active", icon: <CheckCircle className="h-4 w-4 mr-1" />, class: "bg-green-100 text-green-800" },
      expired: { label: "Expired", icon: <AlertCircle className="h-4 w-4 mr-1" />, class: "bg-red-100 text-red-800" },
      pending: { label: "Pending", icon: <Clock className="h-4 w-4 mr-1" />, class: "bg-yellow-100 text-yellow-800" },
    };
    
    const statusInfo = statusMap[status] || statusMap.pending;
    
    return (
      <Badge variant="outline" className={`flex items-center ${statusInfo.class}`}>
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
          return `${assignment.user.firstName} ${assignment.user.lastName}`;
        } else if (assignment.device) {
          return `${assignment.device.brand} ${assignment.device.model} (${assignment.device.assetTag})`;
        }
        return 'Unassigned';
      },
    },
    {
      header: "Type",
      accessor: (assignment: SoftwareAssignment) => assignment.user ? 'User' : 'Device',
      cell: (assignment: SoftwareAssignment) => (
        <Badge variant="secondary">
          {assignment.user ? 'User' : 'Device'}
        </Badge>
      ),
    },
    {
      header: "Assignment Date",
      accessor: (assignment: SoftwareAssignment) => formatDate(assignment.assignmentDate),
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
        <DialogContent className="sm:max-w-[600px]">
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
        <DialogContent className="sm:max-w-[600px]">
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