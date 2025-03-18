import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Plus, AlertTriangle } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { SoftwareForm } from "@/components/forms/SoftwareForm";
import { SoftwareAssignmentForm } from "@/components/forms/SoftwareAssignmentForm";
import { queryClient } from "@/lib/queryClient";
import { PageContainer } from "@/components/layout/PageContainer";

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
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null);
  
  // Query for fetching all software
  const { data: softwareList = [], isLoading: isSoftwareLoading } = useQuery<Software[]>({
    queryKey: ['/api/software'],
  });
  
  // Query for fetching expiring software
  const { data: expiringSoftware = [], isLoading: isExpiringLoading } = useQuery<Software[]>({
    queryKey: ['/api/software/expiring/30'],
  });

  // Queries for different status filters
  const { data: activeSoftware = [], isLoading: isActiveLoading } = useQuery({
    queryKey: ['/api/software/status/active'],
  });
  
  const { data: expiredSoftware = [], isLoading: isExpiredLoading } = useQuery({
    queryKey: ['/api/software/status/expired'],
  });
  
  const { data: pendingSoftware = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ['/api/software/status/pending'],
  });

  const columns = [
    {
      header: "Name",
      accessor: "name",
    },
    {
      header: "Vendor",
      accessor: "vendor",
    },
    {
      header: "License Type",
      accessor: "licenseType",
    },
    {
      header: "Status",
      accessor: (software: Software) => software.status,
      cell: (software: Software) => {
        const statusMap = {
          active: { label: "Active", icon: <CheckCircle className="h-4 w-4 mr-1" />, class: "bg-green-100 text-green-800" },
          expired: { label: "Expired", icon: <AlertCircle className="h-4 w-4 mr-1" />, class: "bg-red-100 text-red-800" },
          pending: { label: "Pending", icon: <Clock className="h-4 w-4 mr-1" />, class: "bg-yellow-100 text-yellow-800" },
        };
        const status = statusMap[software.status];
        
        return (
          <Badge variant="outline" className={`flex items-center ${status.class}`}>
            {status.icon}
            {status.label}
          </Badge>
        );
      }
    },
    {
      header: "Expiry Date",
      accessor: (software: Software) => software.expiryDate ? formatDate(software.expiryDate) : "N/A"
    },
    {
      header: "Seats",
      accessor: (software: Software) => software.seats || "N/A"
    },
    {
      header: "Cost",
      accessor: (software: Software) => software.cost ? formatCurrency(software.cost) : "N/A"
    }
  ];

  const handleSoftwareFormSuccess = () => {
    setIsAddDialogOpen(false);
    // Invalidate queries to refresh the list
    queryClient.invalidateQueries({ queryKey: ['/api/software'] });
    queryClient.invalidateQueries({ queryKey: ['/api/software/status/active'] });
    queryClient.invalidateQueries({ queryKey: ['/api/software/status/expired'] });
    queryClient.invalidateQueries({ queryKey: ['/api/software/status/pending'] });
    queryClient.invalidateQueries({ queryKey: ['/api/software/expiring/30'] });
  };

  const handleAssignmentSuccess = () => {
    setIsAssignDialogOpen(false);
    // Invalidate queries to refresh assignments
    if (selectedSoftware) {
      queryClient.invalidateQueries({ queryKey: ['/api/software', selectedSoftware.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/software-assignments/software', selectedSoftware.id] });
    }
  };

  const handleAssignClick = (software: Software) => {
    setSelectedSoftware(software);
    setIsAssignDialogOpen(true);
  };

  const pageActions = (
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Software</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
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
                actions={[
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
                actions={[
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
                actions={[
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
                actions={[
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
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Assign Software</DialogTitle>
            <DialogDescription>
              {selectedSoftware && `Assign ${selectedSoftware.name} to a user or device.`}
            </DialogDescription>
          </DialogHeader>
          {selectedSoftware && (
            <SoftwareAssignmentForm 
              softwareId={selectedSoftware.id} 
              onSuccess={handleAssignmentSuccess} 
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}