import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Activity types and their corresponding badge styles
const activityStyles: Record<string, { bg: string, text: string }> = {
  'device_assigned': { bg: 'bg-green-100', text: 'text-green-800' },
  'device_unassigned': { bg: 'bg-red-100', text: 'text-red-800' },
  'device_added': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'device_updated': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'device_deleted': { bg: 'bg-red-100', text: 'text-red-800' },
  'user_added': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'user_updated': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'user_deleted': { bg: 'bg-red-100', text: 'text-red-800' },
  'category_added': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'category_updated': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'category_deleted': { bg: 'bg-red-100', text: 'text-red-800' },
  'license_updated': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'maintenance': { bg: 'bg-purple-100', text: 'text-purple-800' }
};

const formatActionType = (actionType: string): string => {
  return actionType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export interface ActivityLog {
  id: number;
  actionType: string;
  details: string;
  timestamp: string;
  user: {
    id: number;
    name: string;
    department?: string;
  } | null;
}

interface ActivityTableProps {
  activities: ActivityLog[];
  loading: boolean;
  itemsPerPage?: number;
  showPagination?: boolean;
  showFirstLast?: boolean;
}

export function ActivityTable({ 
  activities, 
  loading,
  itemsPerPage = 5,
  showPagination = true,
  showFirstLast = false
}: ActivityTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [, navigate] = useLocation();
  
  // Extract device ID from activity details
  const extractDeviceId = (activity: ActivityLog): number | null => {
    // Skip for non-device related activities
    if (!activity.actionType.includes('device') && !activity.actionType.includes('assign')) {
      return null;
    }
    
    // Try to extract device ID from details
    // Format: "Device XXX (ID: 123) was..."
    const idMatch = activity.details.match(/\(ID: (\d+)\)/);
    if (idMatch && idMatch[1]) {
      return parseInt(idMatch[1]);
    }
    
    return null;
  };
  
  // Navigate to device details page when clicking a device-related activity
  const handleActivityClick = (activity: ActivityLog) => {
    const deviceId = extractDeviceId(activity);
    if (deviceId) {
      navigate(`/devices/${deviceId}`);
    }
  };
  
  // Calculate total pages
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  
  // Get current activities
  const indexOfLastActivity = currentPage * itemsPerPage;
  const indexOfFirstActivity = indexOfLastActivity - itemsPerPage;
  const currentActivities = activities.slice(indexOfFirstActivity, indexOfLastActivity);
  
  // Change page
  const paginate = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };
  
  // Go to first or last page
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  
  // Generate visible page numbers (only show 5 pages at a time)
  const getVisiblePageNumbers = () => {
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // If we have less pages than the max, show all
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Calculate the range of pages to show
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = startPage + maxPagesToShow - 1;
      
      // Adjust if we're at the end
      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    }
  };
  
  const pageNumbers = getVisiblePageNumbers();

  return (
    <Card>
      <CardHeader className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <CardTitle className="text-lg leading-6 font-medium text-gray-900">Recent Activity</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">Loading activities...</TableCell>
              </TableRow>
            ) : currentActivities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">No activities found</TableCell>
              </TableRow>
            ) : (
              currentActivities.map((activity) => {
                const style = activityStyles[activity.actionType] || { bg: 'bg-gray-100', text: 'text-gray-800' };
                
                const isDeviceRelated = extractDeviceId(activity) !== null;
                
                return (
                  <TableRow 
                    key={activity.id}
                    className="hover:bg-gray-50"
                  >
                    <TableCell className="whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(activity.timestamp)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge 
                        variant="outline" 
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style.bg} ${style.text} border-0`}
                      >
                        {formatActionType(activity.actionType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {activity.user ? (
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {activity.user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{activity.user.name}</div>
                            {activity.user.department && (
                              <div className="text-sm text-gray-500">{activity.user.department}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">System</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500">
                      {isDeviceRelated ? (
                        <div>
                          {/* Extract device name and make only that part clickable */}
                          {(() => {
                            // Pattern to match "Device [Brand] [Model] (ID: [number])"
                            // Still need to capture the ID for navigation, but won't display it
                            const devicePattern = /(Device\s+([^(]+))\s+\(ID:\s+(\d+)\)/;
                            const match = activity.details.match(devicePattern);
                            
                            if (match) {
                              const [fullMatch, devicePart, deviceName, deviceId] = match;
                              const before = activity.details.substring(0, activity.details.indexOf(fullMatch));
                              const after = activity.details.substring(activity.details.indexOf(fullMatch) + fullMatch.length);
                              
                              return (
                                <>
                                  {before}
                                  Device <span 
                                    className="text-primary hover:underline cursor-pointer" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/devices/${deviceId}`);
                                    }}
                                  >
                                    {deviceName.trim()}
                                  </span>
                                  {/* Hide empty asset tag parentheses */}
                                  {after && after.includes('()') ? after.replace('()', '') : after}
                                </>
                              );
                            }
                            
                            // Fallback if pattern doesn't match
                            return activity.details;
                          })()}
                        </div>
                      ) : (
                        activity.details
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination && totalPages > 1 && (
        <CardContent className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstActivity + 1}</span> to{' '}
                <span className="font-medium">
                  {indexOfLastActivity > activities.length ? activities.length : indexOfLastActivity}
                </span>{' '}
                of <span className="font-medium">{activities.length}</span> results
              </p>
            </div>
            <Pagination>
              <PaginationContent>
                {showFirstLast && (
                  <PaginationItem>
                    <PaginationLink 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        goToFirstPage();
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    >
                      First
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) paginate(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {pageNumbers.map(number => (
                  <PaginationItem key={number}>
                    <PaginationLink 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        paginate(number);
                      }}
                      isActive={currentPage === number}
                    >
                      {number}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) paginate(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {showFirstLast && (
                  <PaginationItem>
                    <PaginationLink 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        goToLastPage();
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    >
                      Last
                    </PaginationLink>
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
