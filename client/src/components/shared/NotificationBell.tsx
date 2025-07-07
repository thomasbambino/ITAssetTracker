import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: "warranty_expiry" | "maintenance_due" | "license_expiry" | "device_assigned" | "problem_report";
  isRead: boolean;
  createdAt: Date | null;
  link?: string | null;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [previousNotificationCount, setPreviousNotificationCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch the current user's data
  const { data: currentUser } = useQuery<{ id: number } | null>({
    queryKey: ['/api/users/me'],
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });
  
  const currentUserId = currentUser?.id;
  
  // Query for fetching unread notifications with real-time polling
  const { data: unreadNotifications = [] } = useQuery({
    queryKey: [`/api/users/${currentUserId}/notifications/unread`],
    enabled: !!currentUserId, // Only run query if currentUserId is available
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });

  // Initialize audio element for notification sound
  useEffect(() => {
    // Create a simple beep sound using AudioContext for better browser compatibility
    const createNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume context if it's suspended (Chrome autoplay policy)
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
      } catch (error) {
        console.log('AudioContext not supported:', error);
      }
    };
    
    audioRef.current = { play: createNotificationSound };
  }, []);

  // Play notification sound when new notifications arrive
  useEffect(() => {
    if (unreadNotifications.length > previousNotificationCount && previousNotificationCount > 0) {
      // New notification arrived, play sound
      if (audioRef.current && audioRef.current.play) {
        try {
          audioRef.current.play();
        } catch (error) {
          // Ignore errors if audio can't play (e.g., user hasn't interacted with page)
          console.log('Audio notification not played:', error);
        }
      }
    }
    setPreviousNotificationCount(unreadNotifications.length);
  }, [unreadNotifications.length, previousNotificationCount]);

  // Get notification icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warranty_expiry":
        return "⚠️";
      case "maintenance_due":
        return "🔧";
      case "license_expiry":
        return "📄";
      case "device_assigned":
        return "✅";
      case "problem_report":
        return ""; // Removed emoji for cleaner display
      default:
        return "🔔";
    }
  };

  // View all notifications
  const viewAllNotifications = () => {
    setIsOpen(false);
    setLocation("/notifications");
  };

  // Type casting for unreadNotifications
  const typedNotifications = unreadNotifications as Notification[];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {typedNotifications.length > 0 && (
            <Badge
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center"
              variant="destructive"
            >
              {typedNotifications.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4 border-b">
          <h4 className="font-medium text-sm">Notifications</h4>
        </div>
        
        <ScrollArea className="h-[300px]">
          {typedNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            <div className="divide-y">
              {typedNotifications.slice(0, 5).map((notification: Notification) => (
                <div 
                  key={notification.id}
                  className="p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    setIsOpen(false);
                    setLocation("/notifications");
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 text-lg">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-medium mb-1">{notification.title}</p>
                      <p className="text-muted-foreground line-clamp-2 mb-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.createdAt ? formatDateTime(notification.createdAt) : "Unknown date"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={viewAllNotifications}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}