import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { StatCard } from '@/components/dashboard/StatCard';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { ActionButton } from '@/components/dashboard/ActionButton';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { ActivityTable, ActivityLog } from '@/components/dashboard/ActivityTable';
import { 
  LaptopIcon, 
  UserPlusIcon, 
  PlusIcon, 
  FileInput, 
  FileOutput,
  UserCheckIcon,
  AlertTriangleIcon,
  CalendarXIcon,
  TicketIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  Legend,
  LabelList
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { CsvImport } from '@/components/ui/csv-import';
import { useCsvExport } from '@/hooks/use-csv';
import { formatNumber } from '@/lib/utils';

export default function Dashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Define types for API responses
  interface DashboardStats {
    totalDevices: number;
    assignedDevices: number;
    unassignedDevices: number;
    expiringWarranties: number;
    openTickets: number;
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

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/stats'],
  });

  // Fetch category distribution
  const { data: categoryDistribution, isLoading: categoriesLoading } = useQuery<CategoryStats[]>({
    queryKey: ['/api/stats/categories'],
  });

  // Fetch department distribution
  const { data: departmentDistribution, isLoading: departmentsLoading } = useQuery<DepartmentStats[]>({
    queryKey: ['/api/stats/departments'],
  });

  // Using ActivityLog imported at the top

  // Fetch recent activity
  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity'],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });
  
  // Set up auto-refresh of activity data
  useEffect(() => {
    // Function to refresh activities
    const refreshActivities = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
    };

    // Set up a document visibility change listener to refresh activities when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshActivities();
      }
    };

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Export handlers
  const { exportCsv: exportUsers, isExporting: isExportingUsers } = useCsvExport('/api/export/users');
  const { exportCsv: exportDevices, isExporting: isExportingDevices } = useCsvExport('/api/export/devices');

  // Action button handlers
  const handleAddDevice = () => {
    navigate('/devices/new');
  };

  const handleAddUser = () => {
    navigate('/users/new');
  };

  const handleExport = () => {
    // Show export options
    toast({
      title: "Export Options",
      description: "Choose what you want to export",
      action: (
        <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full">
          <ActionButton
            icon={<FileOutput className="h-4 w-4" />}
            label="Export Users"
            onClick={exportUsers}
            variant="secondary"
            disabled={isExportingUsers}
            className="w-full sm:w-auto"
          />
          <ActionButton
            icon={<FileOutput className="h-4 w-4" />}
            label="Export Devices"
            onClick={exportDevices}
            variant="secondary"
            disabled={isExportingDevices}
            className="w-full sm:w-auto"
          />
        </div>
      ),
    });
  };

  // Prepare chart data
  const categoryChartData = categoryDistribution?.map((category) => ({
    name: category.name,
    value: category.count,
    percentage: category.percentage,
    totalValue: category.totalValue || 0,
  })) || [];

  const departmentChartData = departmentDistribution?.map((dept) => ({
    name: dept.department || 'Unassigned',
    value: dept.count,
  })) || [];

  // Chart colors
  const CATEGORY_COLORS = {
    'Desktop': '#4ADE80',     // Green
    'Laptop': '#3B82F6',      // Blue
    'Mobile': '#FB923C',      // Orange
    'Tablet': '#F472B6',      // Pink
    'Server': '#A78BFA',      // Purple
    'Monitor': '#F87171',     // Red
    'Printer': '#FBBF24',     // Yellow
    'Network': '#60A5FA',     // Light Blue
    'Networking': '#60A5FA',  // Light Blue
    'Workstations': '#F43F5E', // Rose
    'Peripheral': '#D946EF',  // Fuchsia
    'Desk Phone': '#EC4899',  // Pink
    'Phone': '#EC4899',       // Pink
    'Apple': '#EA580C',       // Orange
    'Camera': '#8B5CF6',      // Violet
    'Mic': '#06B6D4',         // Cyan
    'AV': '#0EA5E9',          // Sky
    'Firewall': '#EF4444',    // Red
    'Router': '#F59E0B',      // Amber
    'Switch': '#10B981',      // Emerald
    'Accessories': '#94A3B8', // Gray
    'Other': '#64748B'        // Dark Gray
  };

  // Get the top 5 categories and group the rest as "Other"
  const processedCategoryData = [...(categoryChartData || [])];
  
  // Show only top 5 categories, combine the rest into "Other"
  let sortedCategoryData = processedCategoryData;
  
  // First, sort by percentage in descending order
  sortedCategoryData = sortedCategoryData.sort((a, b) => b.percentage - a.percentage);
  
  if (processedCategoryData.length > 5) {
    const top5 = processedCategoryData.slice(0, 5);
    const otherCategories = processedCategoryData.slice(5);
    
    const otherCount = otherCategories.reduce((sum, cat) => sum + cat.value, 0);
    const totalCount = processedCategoryData.reduce((sum, cat) => sum + cat.value, 0);
    const otherPercentage = totalCount > 0 ? Math.round((otherCount / totalCount) * 100) : 0;
    
    // Also calculate total value for "Others" - ensure we're using numbers
    const otherTotalValue = otherCategories.reduce((sum, cat) => {
      // Make sure cat.totalValue is treated as a number
      const value = typeof cat.totalValue === 'number' ? cat.totalValue : 0;
      return sum + value;
    }, 0);
    
    if (otherCount > 0) {
      top5.push({
        name: 'Other',
        value: otherCount,
        percentage: otherPercentage,
        totalValue: otherTotalValue
      });
    }
    
    sortedCategoryData = top5;
  }
  
  // Ensure data is sorted by percentage before rendering (highest to lowest)
  sortedCategoryData = sortedCategoryData.sort((a, b) => b.percentage - a.percentage);
  
  const sortedDepartmentData = [...(departmentChartData || [])].sort((a, b) => b.value - a.value);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mt-10 md:mt-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Overview of your IT asset management system</p>
        </div>
        
        {/* Global Search */}
        <div className="mt-4 md:mt-0 w-full md:w-96">
          <GlobalSearch />
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="animate-in fade-in slide-in-from-left-4 duration-300" style={{ animationDelay: '0ms' }}>
          <ActionButton
            icon={<PlusIcon className="h-4 w-4" />}
            label="Add Device"
            onClick={handleAddDevice}
          />
        </div>
        <div className="animate-in fade-in slide-in-from-left-4 duration-300" style={{ animationDelay: '100ms' }}>
          <ActionButton
            icon={<UserPlusIcon className="h-4 w-4" />}
            label="Add User"
            onClick={handleAddUser}
          />
        </div>
        <div className="animate-in fade-in slide-in-from-left-4 duration-300" style={{ animationDelay: '200ms' }}>
          <CsvImport 
            url="/api/import/users"
            entityName="Users"
            buttonText="Import"
            buttonVariant="outline"
          />
        </div>
        <div className="animate-in fade-in slide-in-from-left-4 duration-300" style={{ animationDelay: '300ms' }}>
          <ActionButton
            icon={<FileOutput className="h-4 w-4" />}
            label="Export"
            onClick={handleExport}
            variant="secondary"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          // Skeleton loading with staggered animation
          <>
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <SkeletonCard />
              </div>
            ))}
          </>
        ) : (
          // Actual cards with staggered animation
          <>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '0ms' }}>
              <StatCard
                icon={<LaptopIcon className="h-6 w-6 text-primary-600" />}
                iconClass="bg-primary-100"
                title="Total Devices"
                value={stats?.totalDevices || 0}
                footerText="View all"
                footerLink="/devices"
              />
            </div>
            
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
              <StatCard
                icon={<UserCheckIcon className="h-6 w-6 text-green-600" />}
                iconClass="bg-green-100"
                title="Assigned Devices"
                value={stats?.assignedDevices || 0}
                footerText="View details"
                footerLink="/devices"
                additionalInfo={
                  stats?.totalDevices
                    ? {
                        text: `${Math.round((stats.assignedDevices / stats.totalDevices) * 100)}%`,
                        type: 'success',
                      }
                    : undefined
                }
              />
            </div>
            
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
              <StatCard
                icon={<CalendarXIcon className="h-6 w-6 text-red-600" />}
                iconClass="bg-red-100"
                title="Expiring Warranties"
                value={stats?.expiringWarranties || 0}
                footerText="View all"
                footerLink="/warranties"
                additionalInfo={
                  stats?.expiringWarranties
                    ? {
                        text: 'Next 30 days',
                        type: 'error',
                      }
                    : undefined
                }
              />
            </div>
            
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
              <StatCard
                icon={<TicketIcon className="h-6 w-6 text-purple-600" />}
                iconClass="bg-purple-100"
                title="Open Tickets"
                value={stats?.openTickets || 0}
                footerText="View all"
                footerLink="/problem-reports"
                additionalInfo={
                  stats?.openTickets
                    ? {
                        text: 'Need attention',
                        type: 'warning',
                      }
                    : undefined
                }
              />
            </div>
          </>
        )}

      </div>

      {/* Charts Section */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Asset Distribution by Category">
          {categoriesLoading ? (
            <div className="flex items-center justify-center h-full">
              <p>Loading chart data...</p>
            </div>
          ) : sortedCategoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={sortedCategoryData}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 60, // More space on right for labels
                  left: 10,  // Very small left margin
                  bottom: 10,
                }}
                barSize={16} // Smaller bar height
              >
                <XAxis 
                  type="number" 
                  domain={[0, 'dataMax']} 
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120} 
                  axisLine={false}
                  tickLine={false}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const categoryName = payload.value || 'Other';
                    
                    // Find the category ID if available
                    const categoryId = categoryDistribution?.find(c => c.name === categoryName)?.id;
                    
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text 
                          x={-10} 
                          y={0} 
                          dy={4} 
                          textAnchor="end" 
                          fill="currentColor" 
                          fontSize={13}
                          className="text-foreground cursor-pointer hover:underline"
                          onClick={() => {
                            if (categoryId) {
                              navigate(`/devices?category=${categoryId}`);
                            }
                          }}
                        >
                          {categoryName}
                        </text>
                        <text 
                          x={-1} 
                          y={0} 
                          dy={4} 
                          textAnchor="end" 
                          fill="currentColor"
                          fontSize={10}
                          className="text-foreground cursor-pointer"
                        >
                          →
                        </text>
                      </g>
                    );
                  }}
                  tickMargin={0}
                />
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => {
                    // Format the total value as currency
                    const totalValue = props.payload.totalValue || 0;
                    const deviceCount = props.payload.value || 0;
                    const formattedValue = new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(totalValue / 100); // Convert cents to dollars for display
                    
                    return [
                      // No tooltip name (empty string as second parameter)
                      `${deviceCount} device${deviceCount !== 1 ? 's' : ''} - ${formattedValue}`,
                      ''
                    ];
                  }}
                  cursor={{
                    // Use a very subtle gray that works in both modes
                    fill: 'rgba(128, 128, 128, 0.1)',
                    stroke: 'rgba(128, 128, 128, 0.2)'
                  }}
                  // Custom content to fully control the tooltip display
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const deviceCount = data.value || 0;
                      const totalValue = data.totalValue || 0;
                      const formattedValue = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(totalValue / 100);
                      
                      return (
                        <div className="p-2 bg-card text-card-foreground shadow border rounded">
                          <p className="text-sm font-medium">{data.name}</p>
                          <p className="text-sm">{deviceCount} device{deviceCount !== 1 ? 's' : ''} - {formattedValue}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="value" 
                  name=""  // Empty name to prevent "value" from displaying
                  radius={[3, 3, 3, 3]}
                  // Use 80% of available width to leave room for labels
                  maxBarSize={120}
                >
                  {sortedCategoryData.map((entry, index) => {
                    // Safely get the color based on the category name
                    const categoryName = entry.name || 'Other';
                    const color = Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, categoryName) 
                      ? CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS]
                      : '#64748B';
                      
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={color} 
                      />
                    );
                  })}
                  <LabelList 
                    dataKey="percentage" 
                    position="right" 
                    formatter={(value: number) => `${value}%`}
                    className="text-foreground"
                    style={{ fontWeight: "500", fill: "currentColor" }}
                    offset={10} // Padding between bar end and label
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p>No category data available</p>
            </div>
          )}
        </ChartCard>
        
        <ChartCard title="Assets by Department">
          {departmentsLoading ? (
            <div className="flex items-center justify-center h-full">
              <p>Loading chart data...</p>
            </div>
          ) : sortedDepartmentData.length > 0 ? (
            <div className="p-4 h-[300px] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {sortedDepartmentData.map((dept, index) => {
                  // Set all department colors to black
                  const deptName = dept.name || 'Unassigned';
                  
                  return (
                    <div 
                      key={index} 
                      className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/devices?department=${encodeURIComponent(deptName)}`)}
                      title={`View devices in ${deptName} department`}
                    >
                      <div 
                        className="text-4xl font-semibold mb-1 text-foreground" 
                      >
                        {formatNumber(dept.value)}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        {deptName}
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-3 w-3 ml-1 text-muted-foreground" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p>No department data available</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <ActivityTable 
          activities={activities || []} 
          loading={activitiesLoading}
          itemsPerPage={5}
        />
      </div>
    </div>
  );
}
