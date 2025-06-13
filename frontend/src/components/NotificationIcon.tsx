import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { getWebSocketService, WebSocketService } from '../Services/websocketService';

interface Notification {
  _id: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  ID: string;
}

interface WebSocketNotificationMessage {
  type: 'notifications' | 'notification_update';
  status: 'success' | 'error';
  message?: string;
  data: Notification | Notification[];
}

export default function NotificationIcon() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocketService | null>(null);

  const updateUnreadCount = useCallback(() => {
    const unread = notifications.filter(notif => !notif.isRead).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Update unread count whenever notifications change
  useEffect(() => {
    updateUnreadCount();
  }, [notifications, updateUnreadCount]);
  const handleWebSocketMessage = useCallback((data: WebSocketNotificationMessage) => {
    console.log('WebSocket message received:', data); // Add logging for debugging
  
    // Handle initial notifications load
    if (data.type === 'notifications' && data.status === 'success') {
      const notificationsData = Array.isArray(data.data) ? data.data : [];
      setNotifications(notificationsData);
      const unread = notificationsData.filter(notif => !notif.isRead)?.length || 0;
      setUnreadCount(unread);
    }
    
    // Handle single notification updates
    if (data.type === 'notification_update' && data.status === 'success') {
      const newNotification = data.data as Notification;
      setNotifications(prev => {
        // Check if notification already exists
        const exists = prev.some(n => n.ID === newNotification.ID);
        if (exists) {
          // Update existing notification
          return prev.map(notif => 
            notif.ID === newNotification.ID ? newNotification : notif
          );
        } else {
          // Add new notification at the beginning
          return [newNotification, ...prev];
        }
      });
      updateUnreadCount();
    }
  }, []);

 /* const updateUnreadCount = useCallback(() => {
    const unread = notifications.filter(notif => !notif.isRead)?.length || 0;
    setUnreadCount(unread);
  }, [notifications]);*/

  useEffect(() => {
    const wsService = getWebSocketService();
    wsRef.current = wsService;

    wsService.addMessageHandler(handleWebSocketMessage);
    const wsUrl = `wss://app.instaxbot.com//ws`;
  // or for non-secure connections:
  // const wsUrl = `ws://f0c7-117-247-96-193.ngrok-free.app/ws`;
  
  wsService.connect(wsUrl);

    // Request notifications when connected
    wsService.onConnect(() => {
      const tenentId = localStorage.getItem('tenentid');
      if (tenentId) {
        wsService.sendMessage({
          type: 'get_notifications',
          tenentId
        });
      }
    });

    // Set up periodic refresh
    /*const interval = setInterval(() => {
      if (wsService.isConnected()) {
        const tenentId = localStorage.getItem('tenentid');
        wsService.sendMessage({
          type: 'get_notifications',
          tenentId
        });
      }
    }, 30000);*/

    return () => {
      //clearInterval(interval);
      wsService.disconnect();
    };
  }, [handleWebSocketMessage]);

  /*const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };*/
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const markAsRead = async (id: string) => {
    const tenentId = localStorage.getItem('tenentid');
    if (wsRef.current?.isConnected() && tenentId) {
      wsRef.current.sendMessage({
        type: 'mark_notification_read',
        id,
        tenentId
      });
      
      // Optimistically update the local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.ID === id ? { ...notif, isRead: true } : notif
        )
      );
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Notification Bell Icon */}
      <div
        className="relative cursor-pointer"
        onClick={() => setIsDropdownOpen((prev) => !prev)}
      >
        <div className="relative cursor-pointer p-2 rounded-full bg-white hover:bg-gray-200 shadow-lg transition-all">
          <Bell size={28} className="text-gray-700 hover:text-gray-900" />
        </div>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-blue-500 rounded-full transform translate-x-2 -translate-y-2">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Notifications Dropdown */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
          <div className="p-4 font-semibold text-gray-700 border-b">Notifications</div>
          <div className="max-h-60 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No new notifications.</div>
            ) : (
              notifications.map((notif: Notification) => (
                <div
                  key={notif.ID}
                  className={`p-3 cursor-pointer border-b ${
                    notif.isRead
                      ? "bg-white text-gray-600"
                      : "bg-blue-100 text-gray-900 font-semibold"
                  } hover:bg-gray-50`}
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notif.ID);
                  }}
                >
                  <p className="text-sm">{notif.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}