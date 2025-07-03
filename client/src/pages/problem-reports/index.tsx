import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, MessageSquare, Clock, CheckCircle, Archive, User, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProblemReportDetailDialog } from "@/components/dialogs/ProblemReportDetailDialog";

interface ProblemReport {
  id: number;
  userId: number;
  type: string;
  itemId: number;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "completed" | "archived";
  assignedToId?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completedById?: number;
  userFirstName: string;
  userLastName: string;
  assignedToFirstName?: string;
  assignedToLastName?: string;
  completedByFirstName?: string;
  completedByLastName?: string;
}

export default function ProblemReportsPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: reports = [], isLoading } = useQuery<ProblemReport[]>({
    queryKey: ['/api/problem-reports', selectedStatus === 'all' ? undefined : selectedStatus],
    queryFn: () => apiRequest({
      url: '/api/problem-reports',
      params: selectedStatus !== 'all' ? { status: selectedStatus } : {}
    })
  });

  const { data: adminUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    select: (users) => users.filter(user => user.role === 'admin')
  });

  const updateReportMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      return apiRequest({
        url: `/api/problem-reports/${data.id}`,
        method: 'PUT',
        data: data.updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports'] });
      toast({
        title: "Problem Report Updated",
        description: "The problem report has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to update problem report.",
      });
    },
  });

  const completeReportMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest({
        url: `/api/problem-reports/${id}/complete`,
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports'] });
      toast({
        title: "Problem Report Completed",
        description: "The problem report has been marked as completed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to complete problem report.",
      });
    },
  });

  const archiveReportMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest({
        url: `/api/problem-reports/${id}/archive`,
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports'] });
      toast({
        title: "Problem Report Archived",
        description: "The problem report has been archived.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to archive problem report.",
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-blue-100 text-blue-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "urgent": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-100 text-red-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      case "archived": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertTriangle className="h-4 w-4" />;
      case "in_progress": return <Clock className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "archived": return <Archive className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const handleAssignUser = (reportId: number, userId: number) => {
    updateReportMutation.mutate({
      id: reportId,
      updates: { assignedToId: userId }
    });
  };

  const handleStatusChange = (reportId: number, status: string) => {
    updateReportMutation.mutate({
      id: reportId,
      updates: { status }
    });
  };

  const filteredReports = reports.filter(report => {
    if (selectedStatus === 'all') return true;
    return report.status === selectedStatus;
  });

  const openReports = reports.filter(r => r.status === 'open').length;
  const inProgressReports = reports.filter(r => r.status === 'in_progress').length;
  const completedReports = reports.filter(r => r.status === 'completed').length;
  const archivedReports = reports.filter(r => r.status === 'archived').length;

  return (
    <PageContainer
      title="Problem Reports"
      description="Manage and respond to user problem reports"
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Reports</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{openReports}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{inProgressReports}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedReports}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Archived</CardTitle>
              <Archive className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{archivedReports}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Problem Reports List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading problem reports...</div>
          ) : filteredReports.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No problem reports found.</p>
              </CardContent>
            </Card>
          ) : (
            filteredReports.map((report) => (
              <Card key={report.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(report.priority)}>
                          {report.priority.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(report.status)} variant="outline">
                          {getStatusIcon(report.status)}
                          <span className="ml-1 capitalize">{report.status.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{report.subject}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {report.userFirstName} {report.userLastName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDateTime(report.createdAt)}
                        </div>
                        {report.assignedToFirstName && (
                          <div className="text-blue-600">
                            Assigned to: {report.assignedToFirstName} {report.assignedToLastName}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReportId(report.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        View Details
                      </Button>

                      {report.status !== 'completed' && report.status !== 'archived' && (
                        <>
                          <Select
                            value={report.assignedToId?.toString() || "unassigned"}
                            onValueChange={(value) => 
                              handleAssignUser(report.id, value === "unassigned" ? 0 : parseInt(value))
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Assign" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {adminUsers.map((admin) => (
                                <SelectItem key={admin.id} value={admin.id.toString()}>
                                  {admin.firstName} {admin.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={report.status}
                            onValueChange={(value) => handleStatusChange(report.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>

                          {report.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => archiveReportMutation.mutate(report.id)}
                            >
                              <Archive className="h-4 w-4 mr-1" />
                              Archive
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-2">{report.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Problem Report Detail Dialog */}
      {selectedReportId && (
        <ProblemReportDetailDialog
          reportId={selectedReportId}
          open={!!selectedReportId}
          onOpenChange={(open) => !open && setSelectedReportId(null)}
        />
      )}
    </PageContainer>
  );
}