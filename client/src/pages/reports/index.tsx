import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  PieChart, 
  TrendingUp, 
  Download, 
  Users, 
  Laptop, 
  BarChart,
  Calendar,
  DollarSign,
  ShieldAlert,
  Clock 
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PieChartComponent, BarChartComponent } from "@/components/reports/Charts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";

// Type definitions
interface Stats {
  totalDevices: number;
  assignedDevices: number;
  unassignedDevices: number;
  expiringWarranties: number;
}

interface CategoryStats {
  id: number;
  name: string;
  count: number;
  percentage: number;
  totalValue: number;
}

interface DepartmentStats {
  department: string;
  count: number;
  percentage: number;
}

interface ExpenseItem {
  category: string;
  count: number;
  avgValue: number;
  totalValue: number;
}

interface WarrantyItem {
  id: number;
  brand: string;
  model: string;
  assetTag: string;
  serialNumber: string;
  purchaseDate: Date | null;
  warrantyEOL: Date | null;
  daysRemaining: number;
}

export default function Reports() {
  const [timeframe, setTimeframe] = useState<string>("30");
  
  // Fetch stats data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getQueryFn<Stats>({ on401: "throw" })
  });
  
  // Fetch category distribution
  const { data: categoryStats, isLoading: categoryLoading } = useQuery({
    queryKey: ['/api/stats/categories'],
    queryFn: getQueryFn<CategoryStats[]>({ on401: "throw" })
  });
  
  // Fetch department distribution
  const { data: departmentStats, isLoading: departmentLoading } = useQuery({
    queryKey: ['/api/stats/departments'],
    queryFn: getQueryFn<DepartmentStats[]>({ on401: "throw" })
  });
  
  // Generate expense data by category
  const expenseData = categoryStats?.map(category => ({
    category: category.name,
    count: category.count,
    avgValue: category.count > 0 ? category.totalValue / category.count : 0,
    totalValue: category.totalValue
  })) || [];
  
  // Fetch devices for warranty report
  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['/api/devices'],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  // Process warranty data
  const warrantyItems = devices
    ?.filter(device => device.warrantyEOL)
    .map(device => {
      const warrantyDate = device.warrantyEOL ? new Date(device.warrantyEOL) : null;
      const today = new Date();
      const daysRemaining = warrantyDate ? 
        Math.ceil((warrantyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      return {
        ...device,
        daysRemaining
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 10) || [];
  
  // Download handlers
  const handleDownloadUsers = () => {
    window.location.href = '/api/export/users';
  };
  
  const handleDownloadDevices = () => {
    window.location.href = '/api/export/devices';
  };
  
  // PageActions menu
  const pageActions = (
    <div className="flex space-x-2">
      <Select
        defaultValue="30"
        onValueChange={(value) => setTimeframe(value)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Timeframe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
          <SelectItem value="180">Last 180 days</SelectItem>
          <SelectItem value="365">Last 365 days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageContainer
      title="Reports"
      description="Generate and view asset management reports"
      actions={pageActions}
    >
      
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="assets">Asset Reports</TabsTrigger>
          <TabsTrigger value="usage">Usage Reports</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="mt-0">
          {/* Top Stats Card Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="bg-primary/20 p-2 rounded-full">
                    <Laptop className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                  </div>
                </div>
                <div className="mt-4">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <div className="text-3xl font-bold">{stats?.totalDevices || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">All registered devices</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="bg-green-200 dark:bg-green-800 p-2 rounded-full">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Assigned</p>
                  </div>
                </div>
                <div className="mt-4">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <div className="text-3xl font-bold">{stats?.assignedDevices || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats && Math.round((stats.assignedDevices / stats.totalDevices) * 100)}% of total
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="bg-amber-200 dark:bg-amber-800 p-2 rounded-full">
                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Warranties Expiring</p>
                  </div>
                </div>
                <div className="mt-4">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <div className="text-3xl font-bold">{stats?.expiringWarranties || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Within next 30 days</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="bg-blue-200 dark:bg-blue-800 p-2 rounded-full">
                    <Laptop className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unassigned</p>
                  </div>
                </div>
                <div className="mt-4">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <div className="text-3xl font-bold">{stats?.unassignedDevices || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Available for assignment
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Charts Row */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="min-h-[400px]">
              <CardHeader>
                <CardTitle>Assets by Category</CardTitle>
                <CardDescription>
                  Distribution of assets across different categories
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2">
                {categoryLoading ? (
                  <Skeleton className="h-[320px] w-full" />
                ) : categoryStats && categoryStats.length > 0 ? (
                  <PieChartComponent 
                    data={categoryStats}
                    dataKey="count"
                    nameKey="name"
                    tooltipFormatter={(value, name) => [`${value} devices`, `${name}`]}
                    height={320}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[320px]">
                    <p className="text-muted-foreground text-sm">No categories found</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="min-h-[400px]">
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
                <CardDescription>
                  Number of devices assigned to each department
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2">
                {departmentLoading ? (
                  <Skeleton className="h-[320px] w-full" />
                ) : departmentStats && departmentStats.length > 0 ? (
                  <BarChartComponent 
                    data={[...departmentStats].sort((a, b) => b.count - a.count)}
                    xKey="department"
                    yKey="count"
                    tooltipFormatter={(value) => [`${value} devices`]}
                    height={320}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[320px]">
                    <p className="text-muted-foreground text-sm">No department data found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Warranty Report Row */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle>Warranty Expiration Report</CardTitle>
                  <CardDescription>
                    Assets with upcoming warranty expirations
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadDevices}>
                  <Download className="h-4 w-4 mr-2" /> Export Inventory
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : warrantyItems.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warrantyItems.slice(0, 5).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.brand} {item.model}</div>
                            <div className="text-xs text-muted-foreground">{item.assetTag}</div>
                          </TableCell>
                          <TableCell>{item.serialNumber || 'N/A'}</TableCell>
                          <TableCell>{item.warrantyEOL ? formatDate(item.warrantyEOL) : 'N/A'}</TableCell>
                          <TableCell>
                            {item.daysRemaining <= 0 ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : item.daysRemaining <= 30 ? (
                              <Badge variant="warning">Expiring Soon</Badge>
                            ) : (
                              <Badge variant="outline">{item.daysRemaining} days left</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[120px]">
                  <p className="text-muted-foreground">No warranty data available</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Value Distribution */}
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle>Asset Value by Category</CardTitle>
                  <CardDescription>
                    Financial breakdown of assets by category
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {categoryLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Avg Value</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead className="text-right">% of Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseData.filter(item => item.count > 0).map((item, index) => {
                        // Calculate percentage of total value
                        const totalValue = expenseData.reduce((sum, current) => sum + current.totalValue, 0);
                        const percentage = totalValue > 0 ? Math.round((item.totalValue / totalValue) * 100) : 0;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.category}</TableCell>
                            <TableCell>{item.count}</TableCell>
                            <TableCell>{formatCurrency(item.avgValue)}</TableCell>
                            <TableCell>{formatCurrency(item.totalValue)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end">
                                <span className="mr-2">{percentage}%</span>
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assets" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Asset Inventory</CardTitle>
                <CardDescription>
                  Report on current asset inventory and value
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoryLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Avg Value</TableHead>
                          <TableHead>Total Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.count}</TableCell>
                            <TableCell>{formatCurrency(item.avgValue)}</TableCell>
                            <TableCell>{formatCurrency(item.totalValue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-end">
                      <Button onClick={handleDownloadDevices} size="sm">
                        <Download className="h-4 w-4 mr-2" /> Export Full Inventory
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Warranty Report</CardTitle>
                <CardDescription>
                  Assets with upcoming warranty expiration
                </CardDescription>
              </CardHeader>
              <CardContent>
                {devicesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : warrantyItems.length > 0 ? (
                  <div className="space-y-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warrantyItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.brand} {item.model}</div>
                              <div className="text-xs text-muted-foreground">{item.assetTag}</div>
                            </TableCell>
                            <TableCell>{item.warrantyEOL ? formatDate(item.warrantyEOL) : 'N/A'}</TableCell>
                            <TableCell>
                              {item.daysRemaining <= 0 ? (
                                <Badge variant="destructive">Expired</Badge>
                              ) : item.daysRemaining <= 30 ? (
                                <Badge variant="warning">Expiring Soon</Badge>
                              ) : (
                                <Badge variant="outline">{item.daysRemaining} days left</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px]">
                    <p className="text-muted-foreground">No warranty data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="usage" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>User Assignment Report</CardTitle>
              <CardDescription>
                Report on device assignments by user and department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {departmentLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : departmentStats && departmentStats.length > 0 ? (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Department</TableHead>
                            <TableHead>Devices Assigned</TableHead>
                            <TableHead>% of Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...departmentStats].sort((a, b) => b.count - a.count).map((dept, index) => (
                            <TableRow key={index}>
                              <TableCell>{dept.department}</TableCell>
                              <TableCell>{dept.count}</TableCell>
                              <TableCell>{dept.percentage}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4">
                      <div>
                        <h3 className="text-sm font-medium">User Export Options</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Download complete user data with assigned devices
                        </p>
                      </div>
                      <Button onClick={handleDownloadUsers} size="sm">
                        <Download className="h-4 w-4 mr-2" /> Export User Data
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[200px]">
                    <p className="text-muted-foreground">No department data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="maintenance" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Reports</CardTitle>
              <CardDescription>
                Reports on device maintenance, repairs, and warranty status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4 flex flex-col items-center">
                    <div className="bg-primary/10 p-2 rounded-full mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-medium">Scheduled Maintenance</h3>
                    <p className="text-2xl font-bold mt-2">--</p>
                    <p className="text-xs text-muted-foreground mt-1">Upcoming in next 30 days</p>
                  </div>
                  
                  <div className="border rounded-lg p-4 flex flex-col items-center">
                    <div className="bg-primary/10 p-2 rounded-full mb-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-medium">Maintenance Costs</h3>
                    <p className="text-2xl font-bold mt-2">--</p>
                    <p className="text-xs text-muted-foreground mt-1">Total for selected timeframe</p>
                  </div>
                  
                  <div className="border rounded-lg p-4 flex flex-col items-center">
                    <div className="bg-primary/10 p-2 rounded-full mb-2">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-medium">Average Downtime</h3>
                    <p className="text-2xl font-bold mt-2">--</p>
                    <p className="text-xs text-muted-foreground mt-1">Per maintenance event</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Maintenance by Type</h3>
                  <div className="border rounded-md p-4 flex items-center justify-center h-[180px]">
                    <p className="text-muted-foreground text-sm">
                      Enhanced maintenance reports coming soon
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}