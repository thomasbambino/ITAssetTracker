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
  Users,
  Paperclip
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AttachmentList } from "@/components/ui/attachment-list";
import { FileUpload } from "@/components/ui/file-upload";
import { InlineImageInput } from "@/components/ui/inline-image-input";

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
  images?: string[]; // URLs of inline images
}

export function ProblemReportDetailDialog({ problemReportId, isOpen, onClose }: ProblemReportDetailDialogProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isInternalMessage, setIsInternalMessage] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [messageImages, setMessageImages] = useState<File[]>([]);
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

  const { data: reportAttachments = [], isLoading: attachmentsLoading } = useQuery<any[]>({
    queryKey: ['/api/problem-reports', problemReportId, 'attachments'],
    queryFn: () => apiRequest({ url: `/api/problem-reports/${problemReportId}/attachments`, method: 'GET' }),
    enabled: !!problemReportId && isOpen,
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

  // Mark problem report notifications as read when dialog opens
  useEffect(() => {
    if (isOpen && user && problemReportId) {
      // Mark related problem report notifications as read
      const markNotificationsAsRead = async () => {
        try {
          // Get user's notifications to find problem report ones
          const notifications = await apiRequest({ 
            url: `/api/users/${user.id}/notifications`, 
            method: 'GET' 
          });
          
          // Find notifications related to this problem report
          const problemReportNotifications = notifications.filter((notif: any) => 
            notif.type === 'problem_report' && 
            notif.relatedId === problemReportId && 
            !notif.isRead
          );
          
          // Mark each as read
          for (const notif of problemReportNotifications) {
            await apiRequest({ 
              url: `/api/notifications/${notif.id}/read`, 
              method: 'POST' 
            });
          }
          
          // Invalidate notifications cache to update UI
          if (problemReportNotifications.length > 0) {
            queryClient.invalidateQueries({ 
              queryKey: [`/api/users/${user.id}/notifications`] 
            });
            queryClient.invalidateQueries({ 
              queryKey: [`/api/users/${user.id}/notifications/unread`] 
            });
          }
        } catch (error) {
          console.error('Error marking notifications as read:', error);
        }
      };
      
      markNotificationsAsRead();
    }
  }, [isOpen, user, problemReportId]);

  const { data: adminUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    select: (users) => users.filter(user => user.role === 'admin'),
    enabled: user?.role === 'admin'
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; isInternal: boolean }) => {
      // Create FormData for the message with inline images
      const formData = new FormData();
      formData.append('message', data.message);
      formData.append('isInternal', data.isInternal.toString());
      
      // Add inline images to the message
      messageImages.forEach((image, index) => {
        formData.append(`messageImages`, image);
      });
      
      const response = await apiRequest({
        url: `/api/problem-reports/${problemReportId}/messages`,
        method: 'POST',
        data: formData
      });
      
      // If there are attachments, upload them separately
      if (attachments.length > 0) {
        const attachmentFormData = new FormData();
        attachments.forEach((file) => {
          attachmentFormData.append('files', file);
        });
        
        await apiRequest({
          url: `/api/problem-reports/${problemReportId}/attachments`,
          method: "POST",
          data: attachmentFormData,
        });
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', problemReportId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', problemReportId, 'attachments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports'] });
      setNewMessage("");
      setIsInternalMessage(false);
      setAttachments([]);
      setMessageImages([]);
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
    if (!newMessage.trim() && messageImages.length === 0) return;
    
    sendMessageMutation.mutate({
      message: newMessage.trim(),
      isInternal: isInternalMessage
    });
  };

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      const response = await fetch(`/api/attachments/${attachment.id}/download`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      return apiRequest({
        url: `/api/attachments/${attachmentId}`,
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', problemReportId, 'attachments'] });
      toast({
        title: "Attachment deleted",
        description: "The attachment has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attachment",
        variant: "destructive",
      });
    },
  });

  const uploadAttachmentsMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      attachments.forEach((file) => {
        formData.append('files', file);
      });
      
      return apiRequest({
        url: `/api/problem-reports/${problemReportId}/attachments`,
        method: "POST",
        data: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problem-reports', problemReportId, 'attachments'] });
      setAttachments([]);
      toast({
        title: "Attachments uploaded",
        description: "Your files have been uploaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload attachments",
        variant: "destructive",
      });
    },
  });

  const handleUploadAttachments = () => {
    if (attachments.length === 0) return;
    uploadAttachmentsMutation.mutate();
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
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {report.subject}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Left Side - Report Details */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto">
            <Card>
              <CardHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(report.priority || 'medium')}>
                      {(report.priority || 'medium').toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(report.status || 'open')} variant="outline">
                      {getStatusIcon(report.status || 'open')}
                      <span className="ml-1 capitalize">{(report.status || 'open').replace('_', ' ')}</span>
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
                
                {/* Attachments Section */}
                <div className="pt-2 border-t space-y-3">
                  <AttachmentList
                    attachments={reportAttachments}
                    onDownload={handleDownloadAttachment}
                    onDelete={(attachment) => deleteAttachmentMutation.mutate(attachment.id)}
                    canDelete={user?.role === 'admin' || reportAttachments.some(a => a.uploadedBy === user?.id)}
                  />
                  
                  {/* File Upload Section - Only show if user can send messages */}
                  {report.status !== 'archived' && (user?.role === 'admin' || report.userId === user?.id) && (
                    <div className="border rounded-lg p-2 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Add attachments</span>
                        {attachments.length > 0 && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">
                            {attachments.length} file{attachments.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <FileUpload 
                        files={attachments} 
                        onChange={setAttachments} 
                        maxFiles={3}
                        maxSize={10 * 1024 * 1024} // 10MB
                        accept=".jpg,.jpeg,.png,.gif,.pdf"
                        className="text-xs"
                        compact={true}
                      />
                      {attachments.length > 0 && (
                        <div className="flex justify-end mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleUploadAttachments}
                            disabled={uploadAttachmentsMutation.isPending}
                          >
                            {uploadAttachmentsMutation.isPending ? "Uploading..." : "Upload Attachments"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Right Side - Messages */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <Card className="flex-1 flex flex-col max-h-full">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[calc(90vh-240px)]">
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
                            {message.userRole === 'admin' && (
                              <Badge 
                                variant="default"
                                className="text-xs"
                              >
                                Admin
                              </Badge>
                            )}
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
                                ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30' 
                                : 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30'
                              : 'bg-muted/50 border border-border'
                          }`}>
                            {message.message && (
                              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            )}
                            {message.images && message.images.length > 0 && (
                              <div className={`flex flex-wrap gap-2 ${message.message ? 'mt-2' : ''}`}>
                                {message.images.map((imageUrl, index) => (
                                  <img
                                    key={index}
                                    src={imageUrl}
                                    alt={`Message image ${index + 1}`}
                                    className="max-w-xs max-h-48 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => {
                                      // Open image in a new tab for full view
                                      window.open(imageUrl, '_blank');
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
            
            {/* Message Input - Show for admins or original reporter if not archived */}
            {report.status !== 'archived' && (user?.role === 'admin' || report.userId === user?.id) && (
              <div className="border-t p-4 flex-shrink-0">
                <div className="space-y-3">
                  <InlineImageInput
                    value={newMessage}
                    onChange={setNewMessage}
                    images={messageImages}
                    onImagesChange={setMessageImages}
                    placeholder="Type your message... (Ctrl+Enter to send)"
                    maxImages={5}
                    maxImageSize={5 * 1024 * 1024} // 5MB
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
                        disabled={(!newMessage.trim() && messageImages.length === 0) || sendMessageMutation.isPending}
                        size="sm"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}