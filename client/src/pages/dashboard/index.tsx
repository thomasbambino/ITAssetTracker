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

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/stats'],
  });

  // Fetch category distribution
  const { data: categoryDistribution, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/stats/categories'],
  });

  // Fetch department distribution
  const { data: departmentDistribution, isLoading: departmentsLoading } = useQuery({
    queryKey: ['/api/stats/departments'],
  });

  // Fetch recent activity
  const { data: activities, isLoading: activitiesLoading } = useQuery({
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
  const categoryChartData = categoryDistribution?.map((category: any) => ({
    name: category.name,
    value: category.count,
    percentage: category.percentage,
  })) || [];

  const departmentChartData = departmentDistribution?.map((dept: any) => ({
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
  const sortedCategoryData = [...(categoryChartData || [])].sort((a, b) => b.value - a.value);
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
                  left: 40,  // Less space on left to align bars closer
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
                  tick={{ 
                    fill: '#64748B', 
                    fontSize: 13 
                  }}
                  // Ensure all categories have names
                  tickFormatter={(value) => value || 'Other'}
                />
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => [
                    `${value} devices (${props.payload.percentage}%)`,
                    name || 'Other'
                  ]}
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
            <div className="p-5 h-[300px] overflow-y-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left text-sm font-medium text-gray-500 pb-3">Department</th>
                    <th className="text-right text-sm font-medium text-gray-500 pb-3">Count</th>
                    <th className="text-right text-sm font-medium text-gray-500 pb-3">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDepartmentData.map((dept, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 text-sm font-medium">{dept.name || 'Unassigned'}</td>
                      <td className="py-3 text-sm text-right font-medium">{formatNumber(dept.value)}</td>
                      <td className="py-3 text-sm text-right font-medium">{dept.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
