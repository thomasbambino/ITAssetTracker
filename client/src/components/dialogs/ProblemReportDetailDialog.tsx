import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, User, Calendar, MessageSquare, Send, Archive, Users } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ProblemReport {
  id: number;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'completed' | 'archived';
  userId: number;
  userFirstName: string;
  userLastName: string;
  assignedToId?: number;
  assignedToFirstName?: string;
  assignedToLastName?: string;
  completedAt?: string;
  completedByFirstName?: string;
  completedByLastName?: string;
  createdAt: string;
}

interface ProblemReportMessage {
  id: number;
  problemReportId: number;
  userId: number;
  userFirstName: string;
  userLastName: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

interface ProblemReportDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: number;
  user: User | null;
}

export function ProblemReportDetailDialog({
  open,
  onOpenChange,
  reportId,
  user,
}: ProblemReportDetailDialogProps) {
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch problem report
  const { data: report, isLoading: reportLoading } = useQuery<ProblemReport>({
    queryKey: ['/api/problem-reports', reportId],
    queryFn: () => fetch(`/api/problem-reports/${reportId}`, { credentials: 'include' }).then(res => res.json()),
    enabled: open && !!reportId && !isNaN(reportId) && reportId > 0,
  });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ProblemReportMessage[]>({
    queryKey: ['/api/problem-reports', reportId, 'messages'],
    queryFn: () => fetch(`/api/problem-reports/${reportId}/messages`, { credentials: 'include' }).then(res => res.json()),
    enabled: open && !!reportId && !isNaN(reportId) && reportId > 0,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch admin users
  const { data: adminUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    select: (users) => users.filter(u => u.role === 'admin'),
    enabled: open && user?.role === 'admin',
  });

  // Auto-scroll and sound notification when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      if (messages.length > previousMessageCount && previousMessageCount > 0) {
        // Simple beep notification
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          gainNode.gain.value = 0.1;
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
          console.log('Audio not available');
        }
      }
      setPreviousMessageCount(messages.length);
      
      // Smooth scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length, previousMessageCount]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; isInternal: boolean }) => {
      console.log('Mutation function called with:', data, 'reportId:', reportId);
      const response = await apiRequest(`/api/problem-reports/${reportId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('Mutation response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Message sent successfully:', data);
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', reportId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', reportId] });
      toast({
        title: 'Message sent',
        description: 'Your message has been sent successfully',
      });
    },
    onError: (error: any) => {
      console.error('Message sending error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send message',
      });
    },
  });

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: async (assignedToId: number | null) => {
      return apiRequest(`/api/problem-reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedToId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', reportId] });
      toast({
        title: 'Success',
        description: 'Assignment updated successfully',
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest(`/api/problem-reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', reportId] });
      toast({
        title: 'Success',
        description: 'Status updated successfully',
      });
    },
  });

  // Archive report mutation
  const archiveReportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/problem-reports/${reportId}/archive`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', reportId] });
      onOpenChange(false);
      toast({
        title: 'Success',
        description: 'Problem report archived successfully',
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    console.log('Sending message:', { message: message.trim(), isInternal, reportId });
    sendMessageMutation.mutate({ message: message.trim(), isInternal });
  };

  const handleAssignmentChange = (value: string) => {
    const assignedToId = value === 'unassigned' ? null : parseInt(value);
    updateAssignmentMutation.mutate(assignedToId);
  };

  const handleStatusChange = (status: string) => {
    updateStatusMutation.mutate(status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'border-blue-500 text-blue-600';
      case 'in_progress': return 'border-yellow-500 text-yellow-600';
      case 'completed': return 'border-green-500 text-green-600';
      case 'archived': return 'border-gray-500 text-gray-600';
      default: return 'border-gray-500 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return '•';
      case 'in_progress': return '•';
      case 'completed': return '•';
      case 'archived': return '•';
      default: return '•';
    }
  };

  if (reportLoading || !report) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[96vw] max-w-[96vw] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogTitle className="sr-only">Problem Report Details</DialogTitle>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            Problem Report Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Report Details (30% width) */}
          <div className="w-[30%] border-r overflow-y-auto p-4 space-y-4 flex-shrink-0">
            <Card>
              <CardHeader className="pb-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(report.priority)}>
                      {report.priority.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(report.status)} variant="outline">
                      {getStatusIcon(report.status)}
                      <span className="ml-1 capitalize">{report.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight">{report.subject}</CardTitle>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span>{report.userFirstName} {report.userLastName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>{formatDateTime(report.createdAt)}</span>
                  </div>
                  {report.assignedToFirstName && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span>Assigned to: {report.assignedToFirstName} {report.assignedToLastName}</span>
                    </div>
                  )}
                </div>

                {user?.role === 'admin' && report.status !== 'archived' && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                      <Select
                        value={report.assignedToId?.toString() || "unassigned"}
                        onValueChange={handleAssignmentChange}
                      >
                        <SelectTrigger className="w-full">
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
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Select value={report.status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {report.status === 'completed' && (
                      <Button
                        variant="outline"
                        onClick={() => archiveReportMutation.mutate()}
                        disabled={archiveReportMutation.isPending}
                        className="w-full"
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Archive
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2 text-sm">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{report.description}</p>
                  </div>
                  {report.completedAt && (
                    <div className="pt-2 border-t">
                      <h4 className="font-medium mb-2 text-sm">Completed</h4>
                      <p className="text-xs text-muted-foreground">
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
          </div>

          {/* Right Panel - Conversation (70% width) */}
          <div className="w-[70%] flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col m-4 mb-0 border rounded-lg bg-card">
              <div className="px-6 py-4 border-b">
                <h3 className="flex items-center gap-2 text-lg font-medium">
                  <MessageSquare className="h-5 w-5" />
                  Conversation ({messages.length})
                </h3>
              </div>
              
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Messages Area - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="text-center py-4">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.userId === user?.id
                            ? 'bg-blue-100 ml-auto max-w-[80%]'
                            : 'bg-gray-100 mr-auto max-w-[80%]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">
                            {msg.userFirstName} {msg.userLastName}
                          </span>
                          {msg.isInternal && user?.role === 'admin' && (
                            <Badge variant="secondary" className="text-xs ml-2">Internal</Badge>
                          )}
                        </div>
                        <p className="text-sm">{msg.message}</p>
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {formatDateTime(msg.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input - Fixed at bottom */}
                <div className="border-t p-4 space-y-3 flex-shrink-0">
                  {user?.role === 'admin' && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Message Type:</label>
                      <Select value={isInternal ? 'internal' : 'external'} onValueChange={(value) => setIsInternal(value === 'internal')}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external">External</SelectItem>
                          <SelectItem value="internal">Internal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 min-h-[80px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || sendMessageMutation.isPending}
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}