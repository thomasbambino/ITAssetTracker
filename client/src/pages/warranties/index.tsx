import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Calendar, ChevronRight } from 'lucide-react';
import { formatDate, daysFromNow } from '@/lib/utils';

interface Device {
  id: number;
  brand: string;
  model: string;
  assetTag: string;
  serialNumber?: string;
  purchaseDate?: Date | string | null;
  warrantyEOL?: Date | string | null;
  status: string;
  userId?: number | null;
  assignedAt?: Date | string | null;
  location?: string | null;
  department?: string | null;
  invoiceNumber?: string | null;
  invoiceFile?: string | null;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    department?: string | null;
  } | null;
}

export default function WarrantiesPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('all');
  
  // Fetch devices data
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
    refetchInterval: 60000, // Auto-refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Calculate warranty status for all devices
  const devicesWithWarrantyInfo = devices.map(device => {
    const daysLeft = device.warrantyEOL ? daysFromNow(device.warrantyEOL) : null;
    let warrantyStatus: 'expired' | 'expiring' | 'valid' | 'unknown' = 'unknown';
    
    if (daysLeft === null) {
      warrantyStatus = 'unknown';
    } else if (daysLeft <= 0) {
      warrantyStatus = 'expired';
    } else if (daysLeft <= 30) {
      warrantyStatus = 'expiring';
    } else {
      warrantyStatus = 'valid';
    }
    
    return {
      ...device,
      daysLeft,
      warrantyStatus
    };
  });

  // Filter devices based on active tab
  const filteredDevices = activeTab === 'all' 
    ? devicesWithWarrantyInfo 
    : devicesWithWarrantyInfo.filter(device => device.warrantyStatus === activeTab);

  // Sort devices by warranty status (expired first, then expiring, then valid)
  const sortedDevices = [...filteredDevices].sort((a, b) => {
    const statusPriority = { expired: 0, expiring: 1, valid: 2, unknown: 3 };
    const priorityA = statusPriority[a.warrantyStatus];
    const priorityB = statusPriority[b.warrantyStatus];
    
    if (priorityA === priorityB && a.daysLeft !== null && b.daysLeft !== null) {
      return a.daysLeft - b.daysLeft; // Then sort by days left
    }
    return priorityA - priorityB;
  });
  
  const warrantyColumns = [
    {
      header: 'Device',
      accessor: (device: any) => `${device.brand} ${device.model}`,
      cell: (device: any) => (
        <div className="font-medium text-primary hover:underline cursor-pointer" onClick={() => navigate(`/devices/${device.id}`)}>
          {device.brand} {device.model}
        </div>
      ),
      sortable: true
    },
    {
      header: 'Asset Tag',
      accessor: (device: any) => device.assetTag,
      sortable: true
    },
    {
      header: 'Serial Number',
      accessor: (device: any) => device.serialNumber || 'N/A',
      sortable: true
    },
    {
      header: 'Assigned To',
      accessor: (device: any) => device.user ? `${device.user.firstName} ${device.user.lastName}` : 'Unassigned',
      sortable: true
    },
    {
      header: 'Purchase Date',
      accessor: (device: any) => device.purchaseDate ? formatDate(device.purchaseDate) : 'Unknown',
      sortable: true
    },
    {
      header: 'Warranty End',
      accessor: (device: any) => device.warrantyEOL ? formatDate(device.warrantyEOL) : 'Unknown',
      sortable: true
    },
    {
      header: 'Status',
      accessor: (device: any) => device.warrantyStatus,
      cell: (device: any) => {
        switch (device.warrantyStatus) {
          case 'expired':
            return (
              <div className="flex items-center text-destructive">
                <AlertCircle className="mr-1 h-4 w-4" />
                <span>Expired</span>
              </div>
            );
          case 'expiring':
            return (
              <div className="flex items-center text-amber-600">
                <Calendar className="mr-1 h-4 w-4" />
                <span>Expiring in {device.daysLeft} days</span>
              </div>
            );
          case 'valid':
            return (
              <div className="flex items-center text-green-600">
                <CheckCircle className="mr-1 h-4 w-4" />
                <span>Valid ({device.daysLeft} days left)</span>
              </div>
            );
          default:
            return (
              <div className="flex items-center text-muted-foreground">
                <span>Unknown</span>
              </div>
            );
        }
      },
      sortable: true
    },
    {
      header: 'Actions',
      accessor: () => '',
      cell: (device: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/devices/${device.id}`)}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">View details</span>
        </Button>
      )
    }
  ];

  // Summary counts
  const expiredCount = devicesWithWarrantyInfo.filter(d => d.warrantyStatus === 'expired').length;
  const expiringCount = devicesWithWarrantyInfo.filter(d => d.warrantyStatus === 'expiring').length;
  const validCount = devicesWithWarrantyInfo.filter(d => d.warrantyStatus === 'valid').length;
  const unknownCount = devicesWithWarrantyInfo.filter(d => d.warrantyStatus === 'unknown').length;
  const totalCount = devicesWithWarrantyInfo.length;

  return (
    <div className="container p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Device Warranties</h1>
          <p className="text-muted-foreground">Manage and track warranty status for all devices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className={`border-l-4 ${expiredCount > 0 ? 'border-l-destructive' : 'border-l-gray-200'}`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{expiredCount}</div>
            <p className="text-xs text-muted-foreground">devices with expired warranties</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${expiringCount > 0 ? 'border-l-amber-500' : 'border-l-gray-200'}`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{expiringCount}</div>
            <p className="text-xs text-muted-foreground">devices with warranties expiring in 30 days</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valid</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{validCount}</div>
            <p className="text-xs text-muted-foreground">devices with valid warranties</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${unknownCount > 0 ? 'border-l-gray-400' : 'border-l-gray-200'}`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unknown</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{unknownCount}</div>
            <p className="text-xs text-muted-foreground">devices with unknown warranty status</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Devices ({totalCount})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({expiredCount})</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon ({expiringCount})</TabsTrigger>
          <TabsTrigger value="valid">Valid ({validCount})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <DataTable
            data={sortedDevices}
            columns={warrantyColumns}
            keyField="id"
            searchable={true}
            loading={isLoading}
            emptyState={
              <div className="text-center p-6">
                <p className="text-lg font-medium">No devices found</p>
                <p className="text-sm text-muted-foreground">There are no devices with warranty information.</p>
              </div>
            }
          />
        </TabsContent>
        
        <TabsContent value="expired" className="mt-4">
          <DataTable
            data={sortedDevices}
            columns={warrantyColumns}
            keyField="id"
            searchable={true}
            loading={isLoading}
            emptyState={
              <div className="text-center p-6">
                <p className="text-lg font-medium">No expired warranties</p>
                <p className="text-sm text-muted-foreground">There are no devices with expired warranties.</p>
              </div>
            }
          />
        </TabsContent>
        
        <TabsContent value="expiring" className="mt-4">
          <DataTable
            data={sortedDevices}
            columns={warrantyColumns}
            keyField="id"
            searchable={true}
            loading={isLoading}
            emptyState={
              <div className="text-center p-6">
                <p className="text-lg font-medium">No expiring warranties</p>
                <p className="text-sm text-muted-foreground">There are no devices with warranties expiring soon.</p>
              </div>
            }
          />
        </TabsContent>
        
        <TabsContent value="valid" className="mt-4">
          <DataTable
            data={sortedDevices}
            columns={warrantyColumns}
            keyField="id"
            searchable={true}
            loading={isLoading}
            emptyState={
              <div className="text-center p-6">
                <p className="text-lg font-medium">No valid warranties</p>
                <p className="text-sm text-muted-foreground">There are no devices with valid warranties.</p>
              </div>
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}