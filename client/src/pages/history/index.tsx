import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function History() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Activity History</h1>
      
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
              <div className="h-64 flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground text-center">
                  Activity history will be displayed here.
                  <br />
                  <span className="text-sm">Check back soon for updates!</span>
                </p>
              </div>
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
              <div className="h-64 flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground text-center">
                  Device change history will be displayed here.
                  <br />
                  <span className="text-sm">Coming soon!</span>
                </p>
              </div>
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
              <div className="h-64 flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground text-center">
                  Assignment history will be displayed here.
                  <br />
                  <span className="text-sm">Coming soon!</span>
                </p>
              </div>
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
              <div className="h-64 flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground text-center">
                  User change history will be displayed here.
                  <br />
                  <span className="text-sm">Coming soon!</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}