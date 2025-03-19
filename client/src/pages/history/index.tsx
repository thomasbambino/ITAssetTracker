import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityTable, ActivityLog } from "@/components/dashboard/ActivityTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCcwIcon, SearchIcon } from 'lucide-react';

export default function History() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch all activity logs with no limit (unlimited)
  const { data: activities, isLoading: activitiesLoading, refetch } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity', { limit: 0 }],
  });
  
  // Filter activities by search term
  const filterBySearch = (activities: ActivityLog[] | undefined) => {
    if (!activities) return [];
    if (!searchTerm.trim()) return activities;
    
    const search = searchTerm.toLowerCase();
    return activities.filter(activity => 
      activity.actionType.toLowerCase().includes(search) ||
      activity.details.toLowerCase().includes(search) ||
      (activity.user?.name && activity.user.name.toLowerCase().includes(search)) ||
      (activity.user?.department && activity.user.department.toLowerCase().includes(search))
    );
  };
  
  // Filter activities by type and search term
  const filteredActivities = filterBySearch(activities);
  
  const deviceActivities = filterBySearch(activities)?.filter(activity => 
    activity.actionType.includes('device') || 
    activity.actionType.includes('assign')
  ) || [];
  
  const assignmentActivities = filterBySearch(activities)?.filter(activity => 
    activity.actionType.includes('assign')
  ) || [];
  
  const userActivities = filterBySearch(activities)?.filter(activity => 
    activity.actionType.includes('user')
  ) || [];
  
  return (
    <PageContainer 
      title="Activity History"
      description="View all system activity and changes over time"
      actions={
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
        >
          <RefreshCcwIcon className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <div className="w-full mb-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search activities, users, or departments..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Activities</TabsTrigger>
          <TabsTrigger value="devices">Device Changes</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="users">User Changes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>All Activity History</CardTitle>
              <CardDescription>
                View a comprehensive log of all activities in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityTable 
                activities={filteredActivities} 
                loading={activitiesLoading}
                itemsPerPage={50}
                showPagination={true}
                showFirstLast={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="devices" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Device Change History</CardTitle>
              <CardDescription>
                Track all modifications to device records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deviceActivities.length > 0 ? (
                <ActivityTable 
                  activities={deviceActivities} 
                  loading={activitiesLoading}
                  itemsPerPage={50}
                  showPagination={true}
                  showFirstLast={true}
                />
              ) : (
                <div className="h-48 flex items-center justify-center border rounded-md">
                  <p className="text-muted-foreground text-center">
                    No device activity found.
                    <br />
                    <span className="text-sm">Activity will appear here as devices are managed.</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assignments" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Assignment History</CardTitle>
              <CardDescription>
                Track device assignment and unassignment events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignmentActivities.length > 0 ? (
                <ActivityTable 
                  activities={assignmentActivities} 
                  loading={activitiesLoading}
                  itemsPerPage={50}
                  showPagination={true}
                  showFirstLast={true}
                />
              ) : (
                <div className="h-48 flex items-center justify-center border rounded-md">
                  <p className="text-muted-foreground text-center">
                    No assignment activity found.
                    <br />
                    <span className="text-sm">Activity will appear here as devices are assigned.</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>User Change History</CardTitle>
              <CardDescription>
                Track all modifications to user records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userActivities.length > 0 ? (
                <ActivityTable 
                  activities={userActivities}
                  loading={activitiesLoading}
                  itemsPerPage={50}
                  showPagination={true}
                  showFirstLast={true}
                />
              ) : (
                <div className="h-48 flex items-center justify-center border rounded-md">
                  <p className="text-muted-foreground text-center">
                    No user activity found.
                    <br />
                    <span className="text-sm">Activity will appear here as users are managed.</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}