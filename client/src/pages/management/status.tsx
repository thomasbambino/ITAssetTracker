import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AlertCircleIcon, WrenchIcon, ArchiveIcon, BookXIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface Device {
  id: number;
  name: string | null;
  brand: string;
  model: string;
  assetTag: string;
  status: string;
  serialNumber: string;
  userId: number | null;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  warrantyEOL?: string | null;
}

export default function DeviceStatusPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("lost");

  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  // Filter devices by status
  const statusGroups = {
    lost: devices?.filter(d => d.status === 'lost') || [],
    broken: devices?.filter(d => d.status === 'broken') || [],
    retired: devices?.filter(d => d.status === 'retired') || [],
    in_repair: devices?.filter(d => d.status === 'in_repair') || [],
  };
  
  // Function to get the count badge for each tab
  const getStatusCount = (status: keyof typeof statusGroups) => {
    return statusGroups[status]?.length || 0;
  };

  // Function to navigate to device details
  const goToDeviceDetails = (id: number) => {
    navigate(`/devices/${id}`);
  };

  // Function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'lost':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-0">Lost</Badge>;
      case 'broken':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-0">Broken</Badge>;
      case 'retired':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-0">Retired</Badge>;
      case 'in_repair':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-0">In Repair</Badge>;
      default:
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-0">Active</Badge>;
    }
  };

  return (
    <PageContainer title="Device Status Management">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Device Status Management</CardTitle>
            <CardDescription>
              View and manage devices by their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="lost" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="lost" className="relative">
                  <AlertCircleIcon className="w-4 h-4 mr-2 text-amber-500" />
                  <span className={activeTab === "lost" ? "text-white" : "text-amber-800"}>Lost</span>
                  {getStatusCount('lost') > 0 && (
                    <Badge variant="secondary" className="ml-2 absolute -top-2 -right-2 bg-amber-100 text-amber-800">
                      {getStatusCount('lost')}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="broken" className="relative">
                  <BookXIcon className="w-4 h-4 mr-2 text-red-500" />
                  <span className={activeTab === "broken" ? "text-white" : "text-red-800"}>Broken</span>
                  {getStatusCount('broken') > 0 && (
                    <Badge variant="secondary" className="ml-2 absolute -top-2 -right-2 bg-red-100 text-red-800">
                      {getStatusCount('broken')}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="in_repair" className="relative">
                  <WrenchIcon className="w-4 h-4 mr-2 text-blue-500" />
                  <span className={activeTab === "in_repair" ? "text-white" : "text-blue-800"}>In Repair</span>
                  {getStatusCount('in_repair') > 0 && (
                    <Badge variant="secondary" className="ml-2 absolute -top-2 -right-2 bg-blue-100 text-blue-800">
                      {getStatusCount('in_repair')}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="retired" className="relative">
                  <ArchiveIcon className="w-4 h-4 mr-2 text-gray-500" />
                  <span className={activeTab === "retired" ? "text-white" : "text-gray-800"}>Retired</span>
                  {getStatusCount('retired') > 0 && (
                    <Badge variant="secondary" className="ml-2 absolute -top-2 -right-2 bg-gray-100 text-gray-800">
                      {getStatusCount('retired')}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              {Object.keys(statusGroups).map((status) => (
                <TabsContent key={status} value={status} className="border rounded-md mt-4">
                  {isLoading ? (
                    <div className="flex flex-col gap-2 p-4">
                      <Skeleton className="w-full h-12" />
                      <Skeleton className="w-full h-12" />
                      <Skeleton className="w-full h-12" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Device</TableHead>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statusGroups[status as keyof typeof statusGroups].length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              No devices with status: {status.replace('_', ' ')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          statusGroups[status as keyof typeof statusGroups].map((device) => (
                            <TableRow key={device.id}>
                              <TableCell className="font-medium">
                                {device.name || `${device.brand} ${device.model}`}
                                <p className="text-xs text-muted-foreground">{device.assetTag}</p>
                              </TableCell>
                              <TableCell>{device.serialNumber}</TableCell>
                              <TableCell>{getStatusBadge(device.status)}</TableCell>
                              <TableCell>
                                {device.userFirstName && device.userLastName ? (
                                  <>
                                    <p>{`${device.userFirstName} ${device.userLastName}`}</p>
                                    <p className="text-xs text-muted-foreground">{device.userEmail}</p>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">Unassigned</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => goToDeviceDetails(device.id)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}