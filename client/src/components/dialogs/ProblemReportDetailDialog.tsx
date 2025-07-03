import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  Calendar, 
  MessageSquare, 
  Send, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Archive,
  EyeOff,
  Users
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ProblemReportDetailDialogProps {
  reportId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

interface ProblemReportMessage {
  id: number;
  problemReportId: number;
  userId: number;
  message: string;
  isInternal: boolean;
  createdAt: string;
  userFirstName: string;
  userLastName: string;
  userRole: string;
}

export function ProblemReportDetailDialog({ reportId, open, onOpenChange }: ProblemReportDetailDialogProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isInternalMessage, setIsInternalMessage] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: report, isLoading } = useQuery<ProblemReport>({
    queryKey: ['/api/problem-reports', reportId],
    queryFn: () => apiRequest({ url: `/api/problem-reports/${reportId}`, method: 'GET' }),
    enabled: !!reportId && open
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ProblemReportMessage[]>({
    queryKey: ['/api/problem-reports', reportId, 'messages'],
    queryFn: () => apiRequest({ url: `/api/problem-reports/${reportId}/messages`, method: 'GET' }),
    enabled: !!reportId && open
  });

  const { data: adminUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    select: (users) => users.filter(user => user.role === 'admin'),
    enabled: user?.role === 'admin'
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; isInternal: boolean }) => {
      return apiRequest({
        url: `/api/problem-reports/${reportId}/messages`,
        method: 'POST',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', reportId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports'] });
      setNewMessage("");
      setIsInternalMessage(false);
      toast({
        title: "Message Sent",
        description: "Your message has been added to the conversation.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to send message.",
      });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest({
        url: `/api/problem-reports/${reportId}`,
        method: 'PUT',
        data: updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', reportId] });
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports'] });
      toast({
        title: "Report Updated",
        description: "The problem report has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to update report.",
      });
    },
  });

  const completeReportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest({
        url: `/api/problem-reports/${reportId}/complete`,
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', reportId] });
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports'] });
      toast({
        title: "Report Completed",
        description: "The problem report has been marked as completed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to complete report.",
      });
    },
  });

  const archiveReportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest({
        url: `/api/problem-reports/${reportId}/archive`,
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', reportId] });
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports'] });
      onOpenChange(false);
      toast({
        title: "Report Archived",
        description: "The problem report has been archived.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to archive report.",
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

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      message: newMessage.trim(),
      isInternal: isInternalMessage
    });
  };

  const handleAssignmentChange = (userId: string) => {
    updateReportMutation.mutate({
      assignedToId: userId === "unassigned" ? null : parseInt(userId)
    });
  };

  const handleStatusChange = (status: string) => {
    updateReportMutation.mutate({ status });
  };

  if (isLoading || !report) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">Loading problem report...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Problem Report #{report.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Details */}
          <Card>
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
                  <CardTitle className="text-xl">{report.subject}</CardTitle>
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

                {user?.role === 'admin' && report.status !== 'archived' && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={report.assignedToId?.toString() || "unassigned"}
                      onValueChange={handleAssignmentChange}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Assign to" />
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

                    <Select value={report.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-40">
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
                        onClick={() => archiveReportMutation.mutate()}
                        disabled={archiveReportMutation.isPending}
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Archive
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{report.description}</p>
                </div>
                {report.completedAt && (
                  <div>
                    <h4 className="font-medium mb-2">Completed</h4>
                    <p className="text-sm text-muted-foreground">
                      Completed on {formatDateTime(report.completedAt)}
                      {report.completedByFirstName && (
                        <span> by {report.completedByFirstName} {report.completedByLastName}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messagesLoading ? (
                  <div className="text-center py-4">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {message.userFirstName} {message.userLastName}
                            </span>
                            <Badge 
                              variant={message.userRole === 'admin' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {message.userRole === 'admin' ? 'Admin' : 'User'}
                            </Badge>
                            {message.isInternal && (
                              <Badge variant="outline" className="text-xs">
                                <EyeOff className="h-3 w-3 mr-1" />
                                Internal
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(message.createdAt)}
                            </span>
                          </div>
                          <div className={`p-3 rounded-lg ${
                            message.userRole === 'admin' 
                              ? message.isInternal 
                                ? 'bg-orange-50 border border-orange-200' 
                                : 'bg-blue-50 border border-blue-200'
                              : 'bg-gray-50 border border-gray-200'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Separator className="my-4" />

              {/* Message Input */}
              {report.status !== 'archived' && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[100px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSendMessage();
                      }
                    }}
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {user?.role === 'admin' && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="internal"
                            checked={isInternalMessage}
                            onCheckedChange={setIsInternalMessage}
                          />
                          <label
                            htmlFor="internal"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                          >
                            <EyeOff className="h-3 w-3" />
                            Internal message (admin only)
                          </label>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Ctrl+Enter to send</span>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        size="sm"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}