import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import { PageContainer } from '@/components/layout/PageContainer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest as apiRequestOriginal } from '@/lib/queryClient';
import { Loader2, CheckCircle2, AlertCircle, HelpCircle, RefreshCcw } from 'lucide-react';

// Helper function to match the format we're using in the component
const apiRequest = (url: string, method: string, data?: any) => {
  return apiRequestOriginal({ url, method, data });
};

// Define types for our Intune device data
interface IntuneDevice {
  id: number;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  assetTag: string;
  userId: number | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
  isIntuneOnboarded: boolean;
  intuneComplianceStatus: string;
  intuneLastSync: string | null;
}

// Function to format date with proper handling for null values
const formatDate = (date: string | null) => {
  if (!date) return 'Never';
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
};

// Compliance status badge component
const ComplianceStatusBadge = ({ status }: { status: string }) => {
  switch (status.toLowerCase()) {
    case 'compliant':
      return (
        <Badge className="bg-green-500">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Compliant
        </Badge>
      );
    case 'noncompliant':
      return (
        <Badge variant="destructive">
          <AlertCircle className="mr-1 h-3 w-3" />
          Non-Compliant
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <HelpCircle className="mr-1 h-3 w-3" />
          Unknown
        </Badge>
      );
  }
};

// Device Management Dialog Component
const DeviceManagementDialog = ({ device, onClose }: { device: IntuneDevice; onClose: () => void }) => {
  const [isOnboarded, setIsOnboarded] = useState(device.isIntuneOnboarded);
  const [complianceStatus, setComplianceStatus] = useState(device.intuneComplianceStatus);
  const [isSaving, setIsSaving] = useState(false);
  
  const queryClient = useQueryClient();
  
  const updateMutation = useMutation({
    mutationFn: async (data: {
      isIntuneOnboarded: boolean;
      intuneComplianceStatus: string;
      intuneLastSync: Date | null;
    }) => {
      return apiRequest(`/api/intune/devices/${device.id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/intune/devices'] });
      onClose();
    },
  });
  
  const handleSave = () => {
    setIsSaving(true);
    updateMutation.mutate({
      isIntuneOnboarded: isOnboarded,
      intuneComplianceStatus: complianceStatus,
      intuneLastSync: new Date(),
    });
  };
  
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Manage Intune Status</DialogTitle>
        <DialogDescription>
          Configure Microsoft Intune status for {device.name || `${device.brand} ${device.model}`}
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid gap-4 py-4">
        <div className="flex items-center space-x-2">
          <Switch 
            id="onboarded" 
            checked={isOnboarded} 
            onCheckedChange={setIsOnboarded} 
          />
          <Label htmlFor="onboarded">Device is onboarded to Microsoft Intune</Label>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="compliance-status">Compliance Status</Label>
          <Select 
            value={complianceStatus} 
            onValueChange={setComplianceStatus}
            disabled={!isOnboarded}
          >
            <SelectTrigger id="compliance-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="noncompliant">Non-Compliant</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="pt-2">
          <p className="text-sm text-muted-foreground">
            Last Synchronized: {formatDate(device.intuneLastSync)}
          </p>
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

// Main Intune Management Page
export default function IntunePage() {
  const [selectedDevice, setSelectedDevice] = useState<IntuneDevice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Fetch Intune-eligible devices
  const { data: devices = [], isLoading, error } = useQuery<IntuneDevice[]>({
    queryKey: ['/api/intune/devices'],
    retry: 1,
  });
  
  const handleManageDevice = (device: IntuneDevice) => {
    setSelectedDevice(device);
    setDialogOpen(true);
  };
  
  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedDevice(null);
  };
  
  return (
    <PageContainer title="Intune Management">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Microsoft Intune Management</CardTitle>
            <CardDescription>
              Manage device enrollment and compliance status for assigned laptops and desktops. Only devices that are assigned to users are displayed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-10 text-destructive">
                <AlertCircle className="h-10 w-10 mx-auto mb-2" />
                <p>Failed to load Intune devices. Please try again.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {devices?.length || 0} Intune-eligible devices assigned to users
                  </p>
                  <Button variant="outline" size="sm" className="flex items-center gap-1"
                    onClick={() => window.location.reload()}>
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Onboarded</TableHead>
                        <TableHead>Compliance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No assigned laptops or desktops found. Devices must be assigned to users to appear here.
                          </TableCell>
                        </TableRow>
                      ) : (
                        devices?.map((device: IntuneDevice) => (
                          <TableRow key={device.id}>
                            <TableCell className="font-medium">
                              {device.name || `${device.brand} ${device.model}`}
                              <p className="text-xs text-muted-foreground">{device.serialNumber}</p>
                            </TableCell>
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
                            <TableCell>
                              {device.isIntuneOnboarded ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                  Yes
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-muted text-muted-foreground">
                                  No
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <ComplianceStatusBadge status={device.intuneComplianceStatus} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleManageDevice(device)}
                              >
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {selectedDevice && (
          <DeviceManagementDialog 
            device={selectedDevice} 
            onClose={closeDialog} 
          />
        )}
      </Dialog>
    </PageContainer>
  );
}