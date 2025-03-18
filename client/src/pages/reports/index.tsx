import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, PieChart, TrendingUp, Download } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";

export default function Reports() {
  const pageActions = (
    <Button variant="outline">
      <Download className="mr-2 h-4 w-4" /> Export
    </Button>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Asset Summary
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-40 flex items-center justify-center border rounded-md">
                  <p className="text-muted-foreground text-center text-sm">
                    Asset summary reports coming soon
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Distribution by Category
                </CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-40 flex items-center justify-center border rounded-md">
                  <p className="text-muted-foreground text-center text-sm">
                    Category distribution chart coming soon
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Trends
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-40 flex items-center justify-center border rounded-md">
                  <p className="text-muted-foreground text-center text-sm">
                    Trend analysis coming soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="assets" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Asset Reports</CardTitle>
              <CardDescription>
                Detailed reports on asset acquisition, value, and depreciation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground text-center">
                  Asset reports will be available in the next update.
                  <br />
                  <span className="text-sm">Check back soon!</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="usage" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Usage Reports</CardTitle>
              <CardDescription>
                Reports on device utilization and assignment history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground text-center">
                  Usage reports will be available in the next update.
                  <br />
                  <span className="text-sm">Check back soon!</span>
                </p>
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
              <div className="h-64 flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground text-center">
                  Maintenance reports will be available in the next update.
                  <br />
                  <span className="text-sm">Check back soon!</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}