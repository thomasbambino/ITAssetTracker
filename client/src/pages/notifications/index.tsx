import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Bell, CheckCircle, CalendarClock, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
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

// Define notification type based on our schema
interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: "warranty_expiry" | "maintenance_due" | "license_expiry" | "device_assigned";
  isRead: boolean;
  timestamp: Date | null;
  link?: string | null;
}

export default function NotificationsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  
  // Fetch the current user's data
  const { data: currentUser } = useQuery<{ id: number } | null>({
    queryKey: ['/api/users/me'],
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });
  
  const currentUserId = currentUser?.id;
  
  // Query for fetching all notifications
  const { data: notifications = [], isLoading: isNotificationsLoading, refetch } = useQuery({
    queryKey: [`/api/users/${currentUserId}/notifications`],
    enabled: !!currentUserId, // Only run query if currentUserId is available
  });
  
  // Query for fetching unread notifications
  const { data: unreadNotifications = [], isLoading: isUnreadLoading } = useQuery({
    queryKey: [`/api/users/${currentUserId}/notifications/unread`],
    enabled: !!currentUserId, // Only run query if currentUserId is available
  });

  // Mark notification as read
  const markAsRead = async (notification: Notification) => {
    try {
      await apiRequest(
        "PUT",
        `/api/notifications/${notification.id}/read`
      );
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/notifications`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/notifications/unread`] });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notification: Notification) => {
    try {
      await apiRequest(
        "DELETE",
        `/api/notifications/${notification.id}`
      );
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/notifications`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}/notifications/unread`] });
    } catch (error) {
      console.error("Error deleting notification:", error);
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
    setSelectedNotification(notification);
    setIsDialogOpen(true);
    
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
      default:
        return `${baseClass} ${isRead ? "" : "border-l-4 border-primary"}`;
    }
  };

  // Render notification item
  const renderNotificationItem = (notification: Notification) => (
    <div 
      key={notification.id} 
      className={`p-4 mb-2 rounded-md shadow-sm ${getNotificationClass(notification.type, notification.isRead)}`}
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
              {!notification.isRead && (
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  New
                </Badge>
              )}
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
            </div>
          </div>
          <p className={`text-sm mt-1 ${notification.isRead ? "text-muted-foreground" : ""}`}>
            {notification.message}
          </p>
          <div className="flex items-center mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            {notification.timestamp ? formatDate(notification.timestamp) : "Unknown date"}
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
              ) : notifications.length === 0 ? (
                <div className="text-center py-10">
                  <Bell className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    You don't have any notifications yet. They will appear here when they arrive.
                  </p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification: Notification) => 
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
              ) : unreadNotifications.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="mx-auto h-10 w-10 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
                  <p className="text-sm text-muted-foreground">
                    You have no unread notifications.
                  </p>
                </div>
              ) : (
                <div>
                  {unreadNotifications.map((notification: Notification) => 
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
              {selectedNotification?.timestamp && formatDate(selectedNotification.timestamp)}
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
                  deleteNotification(selectedNotification);
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
    </PageContainer>
  );
}