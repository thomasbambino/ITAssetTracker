import { useState, useEffect, useRef } from "react";
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
  problemReportId: number;
  isOpen: boolean;
  onClose: () => void;
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

export function ProblemReportDetailDialog({ problemReportId, isOpen, onClose }: ProblemReportDetailDialogProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isInternalMessage, setIsInternalMessage] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: report, isLoading } = useQuery<ProblemReport>({
    queryKey: ['/api/problem-reports', problemReportId],
    queryFn: () => apiRequest({ url: `/api/problem-reports/${problemReportId}`, method: 'GET' }),
    enabled: !!problemReportId && isOpen
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ProblemReportMessage[]>({
    queryKey: ['/api/problem-reports', problemReportId, 'messages'],
    queryFn: () => apiRequest({ url: `/api/problem-reports/${problemReportId}/messages`, method: 'GET' }),
    enabled: !!problemReportId && isOpen,
    refetchInterval: isOpen ? 5000 : false, // Refresh every 5 seconds when dialog is open
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Check if we have new messages
      if (messages.length > previousMessageCount && previousMessageCount > 0) {
        // Play notification sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAZBSuTze/LgyQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCrfD7pGUaFjmXz+/GgiQELYDT8+CJOwgOY7bt6KNPFAuCurqOjbEVE=');
          audio.volume = 0.1;
          audio.play().catch(console.error);
        } catch (error) {
          console.error('Audio playback failed:', error);
        }
      }
      
      // Update message count
      setPreviousMessageCount(messages.length);
      
      // Scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, previousMessageCount]);

  // Initial scroll to bottom when dialog opens
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, messages.length]);

  const { data: adminUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    select: (users) => users.filter(user => user.role === 'admin'),
    enabled: user?.role === 'admin'
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; isInternal: boolean }) => {
      return apiRequest({
        url: `/api/problem-reports/${problemReportId}/messages`,
        method: 'POST',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', problemReportId, 'messages'] });
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
        url: `/api/problem-reports/${problemReportId}`,
        method: 'PUT',
        data: updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', problemReportId] });
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
        url: `/api/problem-reports/${problemReportId}/complete`,
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', problemReportId] });
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
        url: `/api/problem-reports/${problemReportId}/archive`,
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', problemReportId] });
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports'] });
      onClose();
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
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">Loading problem report...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {report.subject}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Report Details */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
              <div className="space-y-4">
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
                  <CardTitle className="text-lg leading-tight">{report.subject}</CardTitle>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
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
                  <div className="space-y-3 pt-2 border-t">
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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

          {/* Right Side - Messages */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {messagesLoading ? (
                  <div className="text-center py-4">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages
                    .filter(message => user?.role === 'admin' || !message.isInternal) // Show all messages to admins, only non-internal to users
                    .map((message) => (
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
                <div ref={messagesEndRef} />
              </div>

              <Separator className="my-4" />

              {/* Message Input - Show for admins or original reporter if not archived */}
              {report.status !== 'archived' && (user?.role === 'admin' || report.userId === user?.id) && (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}