import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CheckCircle, Clock, Plus, Wrench, AlertTriangle, Calendar, ExternalLink } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { MaintenanceForm } from "@/components/forms/MaintenanceForm";
import { queryClient } from "@/lib/queryClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { useLocation } from "wouter";

// Define maintenance record type based on our schema
interface MaintenanceRecord {
  id: number;
  deviceId: number;
  description: string;
  maintenanceType: string;
  scheduledDate: Date | null;
  completedDate: Date | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  cost: number | null;
  performedBy: string | null;
  notes: string | null;
  createdAt: Date | null;
  device?: {
    id: number;
    brand: string;
    model: string;
    assetTag: string;
  };
}

export default function Maintenance() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [, navigate] = useLocation();
  
  // Query for fetching all maintenance records
  const { data: maintenanceRecords = [], isLoading: isRecordsLoading } = useQuery({
    queryKey: ['/api/maintenance'],
  });
  
  // Query for fetching scheduled maintenance
  const { data: scheduledMaintenance = [], isLoading: isScheduledLoading } = useQuery({
    queryKey: ['/api/maintenance/scheduled'],
  });

  // Handle opening maintenance record details
  const handleRowClick = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setIsAddDialogOpen(true);
  };

  const columns = [
    {
      header: "Asset",
      accessor: (record: MaintenanceRecord) => record.device ? 
        `${record.device.brand} ${record.device.model} (${record.device.assetTag})` : 
        "Unknown Device",
    },
    {
      header: "Description",
      accessor: "description",
    },
    {
      header: "Type",
      accessor: "maintenanceType",
    },
    {
      header: "Status",
      accessor: (record: MaintenanceRecord) => record.status,
      cell: (record: MaintenanceRecord) => {
        const statusMap = {
          scheduled: { label: "Scheduled", icon: <CalendarClock className="h-4 w-4 mr-1" />, class: "bg-blue-100 text-blue-800" },
          in_progress: { label: "In Progress", icon: <Wrench className="h-4 w-4 mr-1" />, class: "bg-yellow-100 text-yellow-800" },
          completed: { label: "Completed", icon: <CheckCircle className="h-4 w-4 mr-1" />, class: "bg-green-100 text-green-800" },
          cancelled: { label: "Cancelled", icon: <AlertTriangle className="h-4 w-4 mr-1" />, class: "bg-red-100 text-red-800" },
        };
        const status = statusMap[record.status];
        
        return (
          <Badge variant="outline" className={`flex items-center ${status.class}`}>
            {status.icon}
            {status.label}
          </Badge>
        );
      }
    },
    {
      header: "Scheduled Date",
      accessor: (record: MaintenanceRecord) => record.scheduledDate ? formatDate(record.scheduledDate) : "Not scheduled"
    },
    {
      header: "Completed Date",
      accessor: (record: MaintenanceRecord) => record.completedDate ? formatDate(record.completedDate) : "Pending"
    },
    {
      header: "Cost",
      accessor: (record: MaintenanceRecord) => record.cost ? formatCurrency(record.cost) : "N/A"
    }
  ];

  const handleMaintenanceFormSuccess = () => {
    setIsAddDialogOpen(false);
    setSelectedRecord(null);
    // Invalidate queries to refresh the list
    queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
    queryClient.invalidateQueries({ queryKey: ['/api/maintenance/scheduled'] });
  };

  const handleEditClick = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setIsAddDialogOpen(true);
  };

  const handleGoToDevice = (record: MaintenanceRecord) => {
    if (record.deviceId && record.device) {
      navigate(`/devices/${record.deviceId}`);
    }
  };

  const getDueMaintenanceCount = () => {
    if (!scheduledMaintenance.length) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return scheduledMaintenance.filter((record: MaintenanceRecord) => {
      if (!record.scheduledDate) return false;
      const scheduleDate = new Date(record.scheduledDate);
      scheduleDate.setHours(0, 0, 0, 0);
      return scheduleDate <= today && record.status !== 'completed' && record.status !== 'cancelled';
    }).length;
  };

  const dueMaintenanceCount = getDueMaintenanceCount();

  const pageActions = (
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> New Maintenance Record</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedRecord ? "Edit Maintenance Record" : "New Maintenance Record"}</DialogTitle>
          <DialogDescription>
            {selectedRecord 
              ? "Update the maintenance record details."
              : "Enter the details for the new maintenance record."}
          </DialogDescription>
        </DialogHeader>
        <MaintenanceForm 
          record={selectedRecord} 
          onSuccess={handleMaintenanceFormSuccess} 
        />
      </DialogContent>
    </Dialog>
  );

  return (
    <PageContainer
      title="Maintenance Tracker"
      description="Schedule and manage maintenance for your assets"
      actions={pageActions}
    >
      
      {/* Maintenance Due Alert */}
      {dueMaintenanceCount > 0 && (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <CardTitle className="text-red-800">Maintenance Overdue</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-2">
              {dueMaintenanceCount} maintenance {dueMaintenanceCount === 1 ? 'task is' : 'tasks are'} overdue or due today.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {scheduledMaintenance
                .filter((record: MaintenanceRecord) => {
                  if (!record.scheduledDate) return false;
                  const scheduleDate = new Date(record.scheduledDate);
                  scheduleDate.setHours(0, 0, 0, 0);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return scheduleDate <= today && record.status !== 'completed' && record.status !== 'cancelled';
                })
                .slice(0, 3)
                .map((record: MaintenanceRecord) => (
                  <li key={record.id} className="text-red-700">
                    <span className="font-medium">
                      {record.device ? `${record.device.brand} ${record.device.model}` : "Unknown Device"}
                    </span> - {record.description} (Scheduled: {formatDate(record.scheduledDate)})
                  </li>
                ))}
              {dueMaintenanceCount > 3 && (
                <li className="text-red-700">
                  <span className="font-medium">...and {dueMaintenanceCount - 3} more</span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Records</TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled
            {scheduledMaintenance.length > 0 && (
              <span className="ml-2 bg-primary/20 text-primary rounded-full px-2 py-0.5 text-xs">
                {scheduledMaintenance.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Maintenance Records</CardTitle>
              <CardDescription>
                View all maintenance and repair records for your devices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={maintenanceRecords}
                columns={columns}
                keyField="id"
                loading={isRecordsLoading}
                searchable
                onRowClick={handleRowClick}
                rowCursor="pointer"
                actions={[
                  {
                    label: "Edit",
                    onClick: handleEditClick,
                    icon: <Wrench className="h-4 w-4" />
                  },
                  {
                    label: "Go to Device",
                    onClick: handleGoToDevice,
                    icon: <ExternalLink className="h-4 w-4" />
                  }
                ]}
                emptyState={
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No maintenance records found.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setIsAddDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add your first maintenance record
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Maintenance</CardTitle>
              <CardDescription>
                Upcoming and in-progress maintenance tasks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={scheduledMaintenance}
                columns={columns}
                keyField="id"
                loading={isScheduledLoading}
                searchable
                onRowClick={handleRowClick}
                rowCursor="pointer"
                actions={[
                  {
                    label: "Edit",
                    onClick: handleEditClick,
                    icon: <Wrench className="h-4 w-4" />
                  },
                  {
                    label: "Go to Device",
                    onClick: handleGoToDevice,
                    icon: <ExternalLink className="h-4 w-4" />
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Maintenance</CardTitle>
              <CardDescription>
                History of completed maintenance and repairs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={maintenanceRecords.filter((record: MaintenanceRecord) => record.status === 'completed')}
                columns={columns}
                keyField="id"
                loading={isRecordsLoading}
                searchable
                onRowClick={handleRowClick}
                rowCursor="pointer"
                actions={[
                  {
                    label: "View",
                    onClick: handleEditClick,
                    icon: <Wrench className="h-4 w-4" />
                  },
                  {
                    label: "Go to Device",
                    onClick: handleGoToDevice,
                    icon: <ExternalLink className="h-4 w-4" />
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}