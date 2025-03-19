import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityTable, ActivityLog } from "@/components/dashboard/ActivityTable";
import { Button } from "@/components/ui/button";
import { RefreshCcwIcon } from 'lucide-react';

export default function History() {
  const [activityLimit, setActivityLimit] = useState(50);
  
  // Fetch all activity logs with limit
  const { data: activities, isLoading: activitiesLoading, refetch } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity', { limit: activityLimit }],
  });
  
  // Filter activities by type
  const deviceActivities = activities?.filter(activity => 
    activity.actionType.includes('device') || 
    activity.actionType.includes('assign')
  ) || [];
  
  const assignmentActivities = activities?.filter(activity => 
    activity.actionType.includes('assign')
  ) || [];
  
  const userActivities = activities?.filter(activity => 
    activity.actionType.includes('user')
  ) || [];
  
  const handleLoadMore = () => {
    setActivityLimit(prev => prev + 50);
    refetch();
  };
  
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
                activities={activities || []} 
                loading={activitiesLoading}
                itemsPerPage={10}
              />
              {activities && activities.length >= activityLimit && (
                <div className="flex justify-center mt-4">
                  <Button variant="outline" onClick={handleLoadMore}>
                    Load More
                  </Button>
                </div>
              )}
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
                  itemsPerPage={10}
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
                  itemsPerPage={10}
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
                  itemsPerPage={10}
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