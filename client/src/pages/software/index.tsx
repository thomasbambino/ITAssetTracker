import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Plus, AlertTriangle, Edit as EditIcon } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { SoftwareForm } from "@/components/forms/SoftwareForm";
import { SoftwareAssignmentForm } from "@/components/forms/SoftwareAssignmentForm";
import { BulkSoftwareAssignmentForm } from "@/components/forms/BulkSoftwareAssignmentForm";
import { queryClient } from "@/lib/queryClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { useLocation } from "wouter";

// Define the software type based on our schema
interface Software {
  id: number;
  name: string;
  vendor: string;
  licenseKey?: string | null;
  purchaseDate?: Date | null;
  expiryDate?: Date | null;
  licenseType: string;
  seats?: number | null;
  usedSeats?: number;
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
}

export default function Software() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'single' | 'bulk'>('single');
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null);
  const [, setLocation] = useLocation();
  
  // Query for fetching all software
  const { data: softwareList = [], isLoading: isSoftwareLoading } = useQuery<Software[]>({
    queryKey: ['/api/software'],
  });
  
  // Query for fetching expiring software
  const { data: expiringSoftware = [], isLoading: isExpiringLoading } = useQuery<Software[]>({
    queryKey: ['/api/software/expiring/30'],
  });

  // Queries for different status filters
  const { data: activeSoftware = [], isLoading: isActiveLoading } = useQuery<Software[]>({
    queryKey: ['/api/software/status/active'],
  });
  
  const { data: expiredSoftware = [], isLoading: isExpiredLoading } = useQuery<Software[]>({
    queryKey: ['/api/software/status/expired'],
  });
  
  const { data: pendingSoftware = [], isLoading: isPendingLoading } = useQuery<Software[]>({
    queryKey: ['/api/software/status/pending'],
  });

  const columns = [
    {
      header: "Name",
      accessor: "name" as keyof Software,
    },
    {
      header: "Vendor",
      accessor: "vendor" as keyof Software,
    },
    {
      header: "License Type",
      accessor: "licenseType" as keyof Software,
    },
    {
      header: "Status",
      accessor: (software: Software) => software.status,
      cell: (software: Software) => {
        const statusMap = {
          active: { 
            label: "Active", 
            icon: <CheckCircle className="h-4 w-4 mr-1" />, 
            className: "bg-green-100 text-green-800 hover:bg-green-200 border-0 min-w-[90px] justify-center" 
          },
          expired: { 
            label: "Expired", 
            icon: <AlertCircle className="h-4 w-4 mr-1" />, 
            className: "bg-red-100 text-red-800 hover:bg-red-200 border-0 min-w-[90px] justify-center"
          },
          pending: { 
            label: "Pending", 
            icon: <Clock className="h-4 w-4 mr-1" />, 
            className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-0 min-w-[90px] justify-center"
          },
        };
        const status = statusMap[software.status];
        
        return (
          <div className="flex">
            <Badge 
              variant="outline" 
              className={`flex items-center px-3 py-1 font-medium ${status.className}`}
            >
              {status.icon}
              {status.label}
            </Badge>
          </div>
        );
      }
    },
    {
      header: "Expiry Date",
      accessor: (software: Software) => software.expiryDate ? formatDate(software.expiryDate) : "N/A"
    },
    {
      header: "Seats",
      accessor: (software: Software) => {
        if (!software.seats) return "N/A";
        
        const used = software.usedSeats || 0;
        const total = software.seats;
        const percentage = Math.round((used / total) * 100);
        const isOverCapacity = used > total;
        const isNearCapacity = percentage >= 80 && !isOverCapacity;
        
        return (
          <div className="flex items-center">
            <div className="w-12 text-right mr-3">
              <span className={isOverCapacity ? "text-red-600 font-medium" : ""}>
                {used}/{total}
              </span>
            </div>
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  isOverCapacity ? "bg-red-500" : 
                  isNearCapacity ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ 
                  width: `${Math.min(percentage, 100)}%` 
                }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: "Cost",
      accessor: (software: Software) => software.cost ? formatCurrency(software.cost) : "N/A"
    }
  ];

  const handleSoftwareFormSuccess = () => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedSoftware(null);
    
    // Invalidate queries to refresh the list
    queryClient.invalidateQueries({ queryKey: ['/api/software'] });
    queryClient.invalidateQueries({ queryKey: ['/api/software/status/active'] });
    queryClient.invalidateQueries({ queryKey: ['/api/software/status/expired'] });
    queryClient.invalidateQueries({ queryKey: ['/api/software/status/pending'] });
    queryClient.invalidateQueries({ queryKey: ['/api/software/expiring/30'] });
    // Also invalidate activity logs so they update in real-time
    queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
  };
  
  const handleEditClick = (software: Software) => {
    setSelectedSoftware(software);
    setIsEditDialogOpen(true);
  };

  const handleAssignmentSuccess = () => {
    setIsAssignDialogOpen(false);
    setAssignmentType('single'); // Reset to single assignment type
    // Invalidate queries to refresh assignments
    if (selectedSoftware) {
      queryClient.invalidateQueries({ queryKey: ['/api/software', selectedSoftware.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/software-assignments/software', selectedSoftware.id] });
    }
    // Also invalidate activity logs so they update in real-time
    queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
  };

  const handleAssignClick = (software: Software) => {
    setSelectedSoftware(software);
    setIsAssignDialogOpen(true);
  };
  
  // Handle row click to navigate to software details
  const handleRowClick = (software: Software) => {
    setLocation(`/software/${software.id}`);
  };

  const pageActions = (
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Software</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Software</DialogTitle>
          <DialogDescription>
            Enter the details of the software license or application.
          </DialogDescription>
        </DialogHeader>
        <SoftwareForm onSuccess={handleSoftwareFormSuccess} />
      </DialogContent>
    </Dialog>
  );

  return (
    <PageContainer 
      title="Software Management"
      description="Manage software licenses and installations across your organization"
      actions={pageActions}
    >
      
      {/* Expiring Software Alert */}
      {expiringSoftware.length > 0 && (
        <Card className="mb-6 border-yellow-300 bg-yellow-50">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <CardTitle className="text-yellow-800">Licenses Expiring Soon</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 mb-2">The following software licenses will expire within 30 days:</p>
            <ul className="list-disc pl-5 space-y-1">
              {expiringSoftware.map((software: Software) => (
                <li key={software.id} className="text-yellow-700">
                  <span className="font-medium">{software.name}</span> - Expires on {formatDate(software.expiryDate)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Software</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Software</CardTitle>
              <CardDescription>
                Manage all software licenses and applications in your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={softwareList}
                columns={columns}
                keyField="id"
                loading={isSoftwareLoading}
                searchable
                onRowClick={handleRowClick}
                actions={[
                  {
                    label: "Edit",
                    onClick: handleEditClick,
                    icon: <EditIcon className="h-4 w-4" />
                  },
                  {
                    label: "Assign",
                    onClick: handleAssignClick,
                    icon: <Plus className="h-4 w-4" />
                  }
                ]}
                emptyState={
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No software found. Add your first software license.</p>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Software</CardTitle>
              <CardDescription>
                Software with valid licenses currently in use.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={activeSoftware}
                columns={columns}
                keyField="id"
                loading={isActiveLoading}
                searchable
                onRowClick={handleRowClick}
                actions={[
                  {
                    label: "Edit",
                    onClick: handleEditClick,
                    icon: <EditIcon className="h-4 w-4" />
                  },
                  {
                    label: "Assign",
                    onClick: handleAssignClick,
                    icon: <Plus className="h-4 w-4" />
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="expired" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expired Software</CardTitle>
              <CardDescription>
                Software with expired licenses that need renewal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={expiredSoftware}
                columns={columns}
                keyField="id"
                loading={isExpiredLoading}
                searchable
                onRowClick={handleRowClick}
                actions={[
                  {
                    label: "Edit",
                    onClick: handleEditClick,
                    icon: <EditIcon className="h-4 w-4" />
                  },
                  {
                    label: "Assign",
                    onClick: handleAssignClick,
                    icon: <Plus className="h-4 w-4" />
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Software</CardTitle>
              <CardDescription>
                Software licenses awaiting activation or approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={pendingSoftware}
                columns={columns}
                keyField="id"
                loading={isPendingLoading}
                searchable
                onRowClick={handleRowClick}
                actions={[
                  {
                    label: "Edit",
                    onClick: handleEditClick,
                    icon: <EditIcon className="h-4 w-4" />
                  },
                  {
                    label: "Assign",
                    onClick: handleAssignClick,
                    icon: <Plus className="h-4 w-4" />
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Software Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
        setIsAssignDialogOpen(open);
        if (!open) {
          setAssignmentType('single'); // Reset to single assignment type when dialog closes
        }
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Software</DialogTitle>
            <DialogDescription>
              {selectedSoftware && `Assign ${selectedSoftware.name} to users or devices.`}
            </DialogDescription>
          </DialogHeader>
          {selectedSoftware && (
            <div className="w-full space-y-4">
              {/* Main Assignment Type Tabs */}
              <div className="border-b pb-4">
                <Tabs value={assignmentType} onValueChange={(value) => setAssignmentType(value as 'single' | 'bulk')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-10">
                    <TabsTrigger value="single" className="font-medium">Single Assignment</TabsTrigger>
                    <TabsTrigger value="bulk" className="font-medium">Multiple Users</TabsTrigger>
                  </TabsList>
                  <TabsContent value="single" className="mt-6">
                    <SoftwareAssignmentForm 
                      softwareId={selectedSoftware.id} 
                      onSuccess={handleAssignmentSuccess} 
                    />
                  </TabsContent>
                  <TabsContent value="bulk" className="mt-6">
                    <BulkSoftwareAssignmentForm 
                      softwareId={selectedSoftware.id} 
                      onSuccess={handleAssignmentSuccess} 
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Edit Software Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Software</DialogTitle>
            <DialogDescription>
              {selectedSoftware && `Update details for ${selectedSoftware.name}.`}
            </DialogDescription>
          </DialogHeader>
          {selectedSoftware && (
            <SoftwareForm 
              software={selectedSoftware} 
              onSuccess={handleSoftwareFormSuccess} 
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}