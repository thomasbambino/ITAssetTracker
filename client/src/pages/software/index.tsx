import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Software() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Software</h1>
        <Button>Add Software</Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Software Management</CardTitle>
          <CardDescription>
            This feature is coming soon. You'll be able to manage software licenses, installations, and updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border rounded-md">
            <p className="text-muted-foreground text-center">
              Software management functionality will be available in the next update.
              <br />
              <span className="text-sm">Check back soon!</span>
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <p className="text-sm text-muted-foreground">Last updated: March 18, 2025</p>
        </CardFooter>
      </Card>
    </div>
  );
}