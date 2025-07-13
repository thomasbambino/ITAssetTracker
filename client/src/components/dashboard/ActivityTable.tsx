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
  'password_reset': { bg: 'bg-orange-100', text: 'text-orange-800' },
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
    <Card className="shadow-sm">
      <CardHeader className="px-4 py-4 border-b border-border/50 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <CardTitle className="text-lg leading-6 font-medium text-foreground">Recent Activity</CardTitle>
          </div>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            Live updates
          </div>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i} className="border-b border-border/30">
                    <TableCell className="py-3">
                      <div className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-20 mb-1"></div>
                        <div className="h-3 bg-muted/60 rounded w-16"></div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="animate-pulse">
                        <div className="h-6 bg-muted rounded-full w-20"></div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="animate-pulse flex items-center">
                        <div className="h-7 w-7 bg-muted rounded-full"></div>
                        <div className="ml-3">
                          <div className="h-4 bg-muted rounded w-24 mb-1"></div>
                          <div className="h-3 bg-muted/60 rounded w-16"></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-32"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : currentActivities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                      <div className="w-6 h-6 bg-muted-foreground/30 rounded-full"></div>
                    </div>
                    <p className="text-muted-foreground font-medium">No activities found</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Activity will appear here as users interact with the system</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              currentActivities.map((activity) => {
                const style = activityStyles[activity.actionType] || { bg: 'bg-gray-100', text: 'text-gray-800' };
                
                const isDeviceRelated = extractDeviceId(activity) !== null;
                
                return (
                  <TableRow 
                    key={activity.id}
                    className="hover:bg-muted/30 transition-colors duration-150 border-b border-border/30"
                  >
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{formatDateTime(activity.timestamp).split(', ')[0]}</span>
                        <span className="text-xs text-muted-foreground/70">{formatDateTime(activity.timestamp).split(', ')[1]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-3">
                      <Badge 
                        variant="outline" 
                        className={`px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${style.bg} ${style.text} border-0 shadow-sm`}
                      >
                        {formatActionType(activity.actionType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-3">
                      {activity.user ? (
                        <div className="flex items-center">
                          <Avatar className="h-7 w-7 ring-2 ring-primary/10">
                            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                              {activity.user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-foreground">{activity.user.name}</div>
                            {activity.user.department && (
                              <div className="text-xs text-muted-foreground">{activity.user.department}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <div className="h-7 w-7 bg-muted rounded-full flex items-center justify-center ring-2 ring-muted/20">
                            <span className="text-xs font-medium text-muted-foreground">SYS</span>
                          </div>
                          <div className="ml-3">
                            <span className="text-sm font-medium text-muted-foreground">System</span>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground py-3 max-w-xs">
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
        <CardContent className="bg-muted px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
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
