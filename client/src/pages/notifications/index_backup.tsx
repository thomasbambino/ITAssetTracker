import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Bell, CheckCircle, CalendarClock, Trash2, MessageSquare, Reply, Filter } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProblemReportDetailDialog } from "@/components/dialogs/ProblemReportDetailDialog";
import { useAuth } from "@/components/auth/ProtectedRoute";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Define notification type based on our schema
interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: "warranty_expiry" | "maintenance_due" | "license_expiry" | "device_assigned" | "problem_report";
  isRead: boolean;
  createdAt: Date | null;
  link?: string | null;
  relatedId?: number | null;
  relatedType?: string | null;
}

export default function NotificationsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isProblemReportDialogOpen, setIsProblemReportDialogOpen] = useState(false);
  const [selectedProblemReportId, setSelectedProblemReportId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch the current user's data
  const { data: currentUser } = useQuery<{ id: number } | null>({
    queryKey: ['/api/users/me'],
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });
  
  const currentUserId = currentUser?.id;
  
  // Group problem report notifications by thread for all users
  const processNotifications = (notifs: Notification[]) => {
    if (!currentUser) return notifs;
    
    // For all users, group problem reports by relatedId to show as threads
    const problemReportThreads = new Map();
    const otherNotifications: Notification[] = [];
    
    notifs.forEach(notif => {
      if (notif.type === 'problem_report' && notif.relatedId) {
        if (!problemReportThreads.has(notif.relatedId)) {
          problemReportThreads.set(notif.relatedId, {
            ...notif,
            title: notif.title.replace('Problem Report: ', 'Issue Thread: '),
            message: currentUser.role === 'admin' ? 'Click to view conversation and manage ticket' : 'Click to view conversation and reply to messages'
          });
        }
        // Update to show unread if any message in the thread is unread
        else if (!notif.isRead) {
          const existing = problemReportThreads.get(notif.relatedId);
          problemReportThreads.set(notif.relatedId, { ...existing, isRead: false });
        }
      } else {
        otherNotifications.push(notif);
      }
    });
    
    return [...Array.from(problemReportThreads.values()), ...otherNotifications];
  };
  
  // Query for fetching all notifications with automatic refresh
  const { data: notifications = [], isLoading: isNotificationsLoading, refetch } = useQuery({
    queryKey: [`/api/users/${currentUserId}/notifications`],
    enabled: !!currentUserId, // Only run query if currentUserId is available
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });
  
  // Query for fetching unread notifications with automatic refresh
  const { data: unreadNotifications = [], isLoading: isUnreadLoading } = useQuery({
    queryKey: [`/api/users/${currentUserId}/notifications/unread`],
    enabled: !!currentUserId, // Only run query if currentUserId is available
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });

  // Query for problem reports to get status information for filtering
  const { data: problemReports = [] } = useQuery({
    queryKey: ['/api/problem-reports'],
    enabled: user?.role === 'admin',
    refetchInterval: 30000,
  });

  // Archive notification mutation
  const archiveNotificationMutation = useMutation({
    mutationFn: async (notification: Notification) => {
      if (notification.type === 'problem_report' && notification.relatedId && user?.role === 'admin') {
        // For admin problem reports, archive the problem report
        return await apiRequest({ 
          url: `/api/problem-reports/${notification.relatedId}/archive`, 
          method: 'POST' 
        });
      } else {
        // For regular notifications, delete the notification
        return await apiRequest({ 
          url: `/api/notifications/${notification.id}`, 
          method: 'DELETE' 
        });
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/notifications`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/notifications/unread`] });
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports'] });
      toast({
        title: "Success",
        description: "Notification archived successfully",
      });
    },
    onError: (error) => {
      console.error("Error archiving notification:", error);
      toast({
        title: "Error",
        description: "Failed to archive notification",
        variant: "destructive",
      });
    },
  });

  // Filter notifications based on status and problem report status
  const getFilteredNotifications = () => {
    const processed = processNotifications(notifications);
    
    if (statusFilter === 'all') {
      return processed;
    }
    
    return processed.filter(notif => {
      if (notif.type === 'problem_report' && notif.relatedId) {
        const problemReport = problemReports.find(pr => pr.id === notif.relatedId);
        return problemReport?.status === statusFilter;
      }
      // For non-problem report notifications, show based on read status
      if (statusFilter === 'unread') {
        return !notif.isRead;
      } else if (statusFilter === 'read') {
        return notif.isRead;
      }
      return true;
    });
  };

  // Mark notification as read
  const markAsRead = async (notification: Notification) => {
    try {
      await apiRequest({
        url: `/api/notifications/${notification.id}/read`,
        method: 'POST'
      });
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/notifications`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/notifications/unread`] });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      // In a real implementation, this would call a batch endpoint
      // For now, we'll mark each notification individually
      const promises = unreadNotifications.map((notification: Notification) => 
        markAsRead(notification)
      );
      
      await Promise.all(promises);
      refetch();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Open notification details dialog
  const openNotificationDetails = (notification: Notification) => {
    // If it's a problem report notification, open the problem report dialog
    if (notification.type === "problem_report" && notification.relatedId) {
      setSelectedProblemReportId(notification.relatedId);
      setIsProblemReportDialogOpen(true);
    } else {
      setSelectedNotification(notification);
      setIsDialogOpen(true);
    }
    
    // Mark as read if it's not already
    if (!notification.isRead) {
      markAsRead(notification);
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warranty_expiry":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "maintenance_due":
        return <CalendarClock className="h-5 w-5 text-blue-500" />;
      case "license_expiry":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "device_assigned":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "problem_report":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  // Get class based on notification type
  const getNotificationClass = (type: string, isRead: boolean) => {
    const baseClass = isRead ? "bg-muted/50" : "bg-white";
    
    switch (type) {
      case "warranty_expiry":
        return `${baseClass} ${isRead ? "" : "border-l-4 border-yellow-500"}`;
      case "maintenance_due":
        return `${baseClass} ${isRead ? "" : "border-l-4 border-blue-500"}`;
      case "license_expiry":
        return `${baseClass} ${isRead ? "" : "border-l-4 border-red-500"}`;
      case "device_assigned":
        return `${baseClass} ${isRead ? "" : "border-l-4 border-green-500"}`;
      case "problem_report":
        return `${baseClass} ${isRead ? "" : "border-l-4 border-orange-500"}`;
      default:
        return `${baseClass} ${isRead ? "" : "border-l-4 border-primary"}`;
    }
  };

  // Render notification item
  const renderNotificationItem = (notification: Notification) => (
    <div 
      key={notification.id} 
      className={`p-4 mb-2 rounded-md shadow-sm cursor-pointer hover:bg-muted/50 ${getNotificationClass(notification.type, notification.isRead)}`}
      onClick={() => openNotificationDetails(notification)}
    >
      <div className="flex items-start">
        <div className="mr-3 mt-1">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className={`font-medium ${notification.isRead ? "text-muted-foreground" : ""}`}>
              {notification.title}
            </h3>
            <div className="flex space-x-2">
              {notification.type === "problem_report" && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    openNotificationDetails(notification);
                  }}
                >
                  <Reply className="h-4 w-4 text-blue-500" />
                </Button>
              )}
              {user?.role === 'admin' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveNotificationMutation.mutate(notification);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
              {!notification.isRead && (
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  New
                </Badge>
              )}
              {currentUser?.role === 'admin' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
          <p className={`text-sm mt-1 ${notification.isRead ? "text-muted-foreground" : ""}`}>
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {notification.createdAt ? formatDateTime(notification.createdAt) : "Unknown date"}
            </div>
            {notification.type === "problem_report" && (
              <div className="flex items-center text-xs text-blue-600">
                <MessageSquare className="h-3 w-3 mr-1" />
                Click to view conversation
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const pageActions = unreadNotifications.length > 0 ? (
    <Button variant="outline" onClick={markAllAsRead}>
      Mark All as Read
    </Button>
  ) : null;

  return (
    <PageContainer 
      title="Notifications"
      description="View and manage your system notifications"
      actions={pageActions}
    >
      {/* Filter Controls */}
      {user?.role === 'admin' && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by Status:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notifications</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="open">Open Issues</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Notifications
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadNotifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {isNotificationsLoading ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Loading notifications...</p>
                </div>
              ) : getFilteredNotifications().length === 0 ? (
                <div className="text-center py-10">
                  <Bell className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    You don't have any notifications yet. They will appear here when they arrive.
                  </p>
                </div>
              ) : (
                <div>
                  {getFilteredNotifications().map((notification: Notification) => 
                    renderNotificationItem(notification)
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="unread" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unread Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {isUnreadLoading ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Loading notifications...</p>
                </div>
              ) : processNotifications(unreadNotifications).length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="mx-auto h-10 w-10 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
                  <p className="text-sm text-muted-foreground">
                    You have no unread notifications.
                  </p>
                </div>
              ) : (
                <div>
                  {processNotifications(unreadNotifications).map((notification: Notification) => 
                    renderNotificationItem(notification)
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Notification Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {selectedNotification && getNotificationIcon(selectedNotification.type)}
              <span className="ml-2">{selectedNotification?.title}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedNotification?.createdAt && formatDateTime(selectedNotification.createdAt)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>{selectedNotification?.message}</p>
            {selectedNotification?.link && (
              <Button variant="link" className="px-0 mt-2">
                View Details
              </Button>
            )}
          </div>
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                if (selectedNotification) {
                  archiveNotificationMutation.mutate(selectedNotification);
                }
                setIsDialogOpen(false);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Notification
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Problem Report Detail Dialog */}
      {selectedProblemReportId && (
        <ProblemReportDetailDialog
          isOpen={isProblemReportDialogOpen}
          onClose={() => {
            setIsProblemReportDialogOpen(false);
            setSelectedProblemReportId(null);
          }}
          problemReportId={selectedProblemReportId}
        />
      )}
    </PageContainer>
  );
}