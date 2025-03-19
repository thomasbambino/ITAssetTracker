import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActionButton } from '@/components/dashboard/ActionButton';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { ActivityTable } from '@/components/dashboard/ActivityTable';
import { 
  LaptopIcon, 
  UserPlusIcon, 
  PlusIcon, 
  FileInput, 
  FileOutput,
  UserCheckIcon,
  AlertTriangleIcon,
  CalendarXIcon
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

  // Define ActivityLog interface
  interface ActivityLog {
    id: number;
    actionType: string;
    details: string;
    timestamp: Date | string;
    userId: number | null;
    user?: {
      id: number;
      name: string;
      department?: string;
    } | null;
  }

  // Fetch recent activity
  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity'],
  });

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
        <div className="flex space-x-2 mt-2">
          <ActionButton
            icon={<FileOutput className="h-4 w-4" />}
            label="Export Users"
            onClick={exportUsers}
            variant="secondary"
            disabled={isExportingUsers}
          />
          <ActionButton
            icon={<FileOutput className="h-4 w-4" />}
            label="Export Devices"
            onClick={exportDevices}
            variant="secondary"
            disabled={isExportingDevices}
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
    'Accessories': '#94A3B8', // Gray
    'Other': '#64748B'        // Dark Gray
  };

  // Sort data for better visualization
  // Get the top 5 categories and group the rest as "Other"
  const processedCategoryData = [...(categoryChartData || [])].sort((a, b) => b.value - a.value);
  
  // Show only top 5 categories, combine the rest into "Other"
  let sortedCategoryData = processedCategoryData;
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
  
  const sortedDepartmentData = [...(departmentChartData || [])].sort((a, b) => b.value - a.value);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mt-10 md:mt-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Overview of your IT asset management system</p>
        </div>
        
        {/* Global Search */}
        <div className="mt-4 md:mt-0 w-full md:w-auto">
          <GlobalSearch />
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <ActionButton
          icon={<PlusIcon className="h-4 w-4" />}
          label="Add Device"
          onClick={handleAddDevice}
        />
        <ActionButton
          icon={<UserPlusIcon className="h-4 w-4" />}
          label="Add User"
          onClick={handleAddUser}
        />
        <CsvImport 
          url="/api/import/users"
          entityName="Users"
          buttonText="Import"
          buttonVariant="outline"
        />
        <ActionButton
          icon={<FileOutput className="h-4 w-4" />}
          label="Export"
          onClick={handleExport}
          variant="secondary"
        />
      </div>

      {/* Stats Cards */}
      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<LaptopIcon className="h-6 w-6 text-primary-600" />}
          iconClass="bg-primary-100"
          title="Total Devices"
          value={statsLoading ? 0 : stats?.totalDevices || 0}
          footerText="View all"
          footerLink="/devices"
        />
        
        <StatCard
          icon={<UserCheckIcon className="h-6 w-6 text-green-600" />}
          iconClass="bg-green-100"
          title="Assigned Devices"
          value={statsLoading ? 0 : stats?.assignedDevices || 0}
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
        
        <StatCard
          icon={<AlertTriangleIcon className="h-6 w-6 text-yellow-600" />}
          iconClass="bg-yellow-100"
          title="Unassigned Devices"
          value={statsLoading ? 0 : stats?.unassignedDevices || 0}
          footerText="Assign devices"
          footerLink="/devices/unassigned"
          additionalInfo={
            stats?.totalDevices
              ? {
                  text: `${Math.round((stats.unassignedDevices / stats.totalDevices) * 100)}%`,
                  type: 'warning',
                }
              : undefined
          }
        />
        
        <StatCard
          icon={<CalendarXIcon className="h-6 w-6 text-red-600" />}
          iconClass="bg-red-100"
          title="Expiring Warranties"
          value={statsLoading ? 0 : stats?.expiringWarranties || 0}
          footerText="View all"
          footerLink="/devices"
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
                  width={80} 
                  axisLine={false}
                  tickLine={false}
                  tick={{ 
                    fill: '#64748B', 
                    fontSize: 13 
                  }}
                  // Ensure all categories have names
                  tickFormatter={(value) => value || 'Other'}
                  // Add left padding to move text closer to bars
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
                      `${deviceCount} device${deviceCount !== 1 ? 's' : ''} - ${formattedValue}`,
                      name || 'Other'
                    ];
                  }}
                  cursor={{ fill: '#f5f5f5' }}
                />
                <Bar 
                  dataKey="value" 
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
                    style={{ fontWeight: "500", fill: "#64748B" }}
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
                  // Department-specific colors
                  const colors = {
                    "IT": "#4664f6", // Blue
                    "Marketing": "#4ade80", // Green
                    "Sales": "#eab308", // Yellow
                    "Finance": "#ef4444", // Red
                    "HR": "#a855f7", // Purple
                    "Unassigned": "#94a3b8" // Gray
                  };
                  
                  const deptName = dept.name || 'Unassigned';
                  const color = colors[deptName as keyof typeof colors] || '#94a3b8';
                  
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="text-4xl font-semibold mb-1" 
                        style={{ color }}
                      >
                        {formatNumber(dept.value)}
                      </div>
                      <div className="text-sm text-gray-500">{deptName}</div>
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
