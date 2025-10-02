import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TemplateMessage, { TemplateMessageProps } from '@/components/TemplateMessage';
import AudioMessage from '@/components/AudioMessage';
import ImageMessage from '@/components/ImageMessage';
import VideoMessage from '@/components/VideoMessage';
import CarouselMessage from '@/components/CarouselMessage';
import { getWebSocketService, WebSocketService } from '../Services/websocketService';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

// --- Interface Definitions (No changes here) ---
interface CarouselProduct {
  title: string;
  subtitle: string;
  imageUrl: string;
  buttons: {
    type: string;
    title: string;
    url?: string;
    payload?: string;
  }[];
}

interface Contact {
  _id: string;
  username: string;
  senderId: string;
  createdAt: string;
  name: string;
  profile_pic?: string;
  chatMode: 'chat' | 'human';
  lastMessage?: {
    message: string;
    response: string;
    Timestamp: string;
    messageType?: 'text' | 'template' | 'audio' | 'image' | 'video' | 'ig_reel' | 'ig_stroy' | 'carousel';
  };
}

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  tenentId: string;
  messageType: 'text' | 'template' | 'audio' | 'image' | 'video' | 'ig_reel' | 'ig_stroy' | 'carousel';
  message: string;
  response?: string;
  Timestamp: string;
  audioUrl?: string;
  transcription?: string;
  carouselData?: {
    totalProducts: number;
    products: CarouselProduct[];
  };
}

interface Order {
  _id: string;
  flow_token: string;
  orderId: string;
  bill_no: string;
  tenentId: string;
  senderId: string;
  
  paymentStatus: string;
  
  products: {
    sku: string;
    product_name: string;
    quantity: number;
    price: number;
  }[];
  amount: number;
  amountPaid: number;
  shipping_cost: number;
  total_amount: number;
  currency: string;
  status: string;
  confirmation_sent: boolean;
  print_status: string;
  tracking_status: string;
  holding_status: string;
  is_on_hold: boolean;
  packing_status: string;
  customer_name: string;
  address: string;
  city: string;
  country: string;
  phone_number: string;
  state: string;
  zip_code: string;
  shipping_partner: { name: string } | null;
  tracking_number: string;
  weight: number;
  created_at: string;
  timestamp: string;
  updated_at: string;
}
interface WebSocketAuthMessage {
  type: 'auth';
  status: 'success' | 'error';
  message?: string;
}

interface WebSocketHistoryMessage {
  type: 'history';
  messages: Message[];
}

interface WebSocketNewMessage {
  type: 'new_message';
  message: Message;
}

interface WebSocketContactListMessage {
  type: 'contact_list';
  contacts: Contact[];
  messages: Message[];
}

interface WebSocketErrorMessage {
  type: 'error';
  message: string;
}

interface WebSocketNewContact {
  type: 'new_contact';
  contact: Contact;
}

interface WebSocketContactDetailsMessage {
  type: 'contact_details';
  contact: Contact;
}

interface WebSocketChatModeUpdateMessage {
  type: 'chat_mode_update';
  messageId?: string;
  status: 'success' | 'error';
  message?: string;
  data: {
    senderId: string;
    mode: 'chat' | 'human';
  } | null;
}

interface WebSocketChatModeMessage {
  type: 'chat_mode';
  status: 'success' | 'error';
  message?: string;
  data: {
    mode: 'chat' | 'human';
  } | null;
}

interface WebSocketHumanAgentContactsMessage {
  type: 'human_agent_contacts';
  contacts: Contact[];
  hasMore: boolean;
  totalCount: number;
}

interface SearchResponse {
  type: 'search_results';
  contacts: Contact[];
}

type WebSocketMessage =
  | WebSocketAuthMessage
  | WebSocketHistoryMessage
  | WebSocketNewMessage
  | WebSocketContactListMessage
  | WebSocketNewContact
  | WebSocketErrorMessage
  | WebSocketChatModeUpdateMessage
  | WebSocketChatModeMessage
  | WebSocketContactDetailsMessage
  | WebSocketHumanAgentContactsMessage
  | SearchResponse;


export default function LiveChat() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const processedMessageIds = useRef(new Set<string>());
  const processedModeUpdateIds = useRef(new Set<string>());
  const [showLoadLess, setShowLoadLess] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'humanAgent'>('all');
  const [hasMoreHumanAgents, setHasMoreHumanAgents] = useState(true);
  const [isLoadingMoreHumanAgents, setIsLoadingMoreHumanAgents] = useState(false);
  const [showLoadLessHumanAgents, setShowLoadLessHumanAgents] = useState(false);
  const [humanAgentPage, setHumanAgentPage] = useState(1);
  const [humanAgentContacts, setHumanAgentContacts] = useState<Contact[]>([]);
  const [totalHumanAgentCount, setTotalHumanAgentCount] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [latestOrders, setLatestOrders] = useState<Order[]>([]);
  const [totalOrderCount, setTotalOrderCount] = useState<number>(0);
  const [showOrderDetails, setShowOrderDetails] = useState<boolean>(false);
  
  // --- NEW: State for conversation window expiration ---
  const [isWindowExpired, setIsWindowExpired] = useState(false);

  // --- NEW: Effect to check conversation window status ---
  useEffect(() => {
    const checkWindowStatus = () => {
        // If no contact is selected or there are no messages, we can't send a freeform message.
        if (!selectedContact || messages.length === 0) {
            setIsWindowExpired(true);
            return;
        }

        // Find the timestamp of the very last message sent by the customer (not the agent).
        const lastCustomerMessage = messages
            .filter(msg => msg.senderId === selectedContact.senderId)
            .sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime())[0];

        // --- START OF CHANGES: ADD THESE LOGS FOR DEBUGGING ---
        console.log("--- Checking Conversation Window ---");
        console.log("Last Customer Message Object:", lastCustomerMessage);
        // --- END OF CHANGES ---

        // If the customer has never sent a message, the window is not open.
        if (!lastCustomerMessage) {
            console.log("Result: No customer message found. Window is expired.");
            setIsWindowExpired(true);
            return;
        }

        const lastMessageTime = new Date(lastCustomerMessage.Timestamp).getTime();
        const now = new Date().getTime();
        const hoursSinceLastMessage = (now - lastMessageTime) / (1000 * 60 * 60);

        // --- START OF CHANGES: ADD MORE LOGS HERE ---
        console.log("Last Message Time:", new Date(lastMessageTime).toLocaleString());
        console.log("Current Time:", new Date(now).toLocaleString());
        console.log("Hours Since Last Message:", hoursSinceLastMessage);
        console.log("Is Window Expired (is hours > 24?):", hoursSinceLastMessage > 24);
        console.log("------------------------------------");
        // --- END OF CHANGES ---


        // Check if more than 24 hours have passed.
        setIsWindowExpired(hoursSinceLastMessage > 24);
    };

    // Run the check immediately when the selected contact or messages change.
    checkWindowStatus();

    // Set up an interval to re-check every minute for real-time updates.
    const interval = setInterval(checkWindowStatus, 60 * 1000);

    // Cleanup function to clear the interval when the component unmounts or dependencies change.
    return () => clearInterval(interval);

}, [selectedContact, messages]);


  // Helper functions
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return !isNaN(date.getTime())
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
  };

  const getInitials = (name: string, username: string): string => {
    return (name === "Nil" ? username : name).charAt(0).toUpperCase();
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const updateContactLastMessage = useCallback((message: Message) => {
    // Update main contacts list
    setContacts(prev => prev.map(contact => {
      if (contact.senderId === message.senderId || contact.senderId === message.recipientId) {
        return {
          ...contact,
          lastMessage: {
            message: message.message,
            response: message.response || '',
            Timestamp: message.Timestamp,
            messageType: message.messageType
          }
        };
      }
      return contact;
    }));

    // Also update humanAgentContacts list
    setHumanAgentContacts(prev => prev.map(contact => {
      if (contact.senderId === message.senderId || contact.senderId === message.recipientId) {
        return {
          ...contact,
          lastMessage: {
            message: message.message,
            response: message.response || '',
            Timestamp: message.Timestamp,
            messageType: message.messageType
          }
        };
      }
      return contact;
    }));
  }, []);

  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    console.log('handleWebSocketMessage received:', data);

    switch (data.type) {
      case 'error':
        console.error('Received error from server:', data.message);
        setLoading(false);
        break;

      case 'contact_list':
        if (Array.isArray(data.contacts)) {
          setContacts(prevContacts => {
            const newContacts = [...prevContacts];

            data.contacts.forEach(newContact => {
              const existingIndex = newContacts.findIndex(
                existing => existing.senderId === newContact.senderId
              );

              if (newContact.lastMessage) {
                let messageType: 'text' | 'image' | 'audio' | 'template' | 'video' | 'ig_reel' | 'ig_stroy' | 'carousel' = 'text';
                if (newContact.lastMessage.messageType) {
                  messageType = newContact.lastMessage.messageType;
                }
                newContact.lastMessage = {
                  ...newContact.lastMessage,
                  messageType
                };
              }

              if (existingIndex === -1) {
                newContacts.push(newContact);
              }
            });

            const sortedContacts = newContacts.sort((a, b) => {
              const aTime = a.lastMessage?.Timestamp || a.createdAt;
              const bTime = b.lastMessage?.Timestamp || b.createdAt;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
            setShowLoadLess(sortedContacts.length > 25);
            setHasMore(data.contacts.length === 25);
            setIsLoadingMore(false);
            return sortedContacts;
          });
          setLoading(false);
        }
        break;

      case 'new_contact':
        console.log('New contact received:', data.contact);
        setContacts(prevContacts => {
          // Check if contact already exists
          const exists = prevContacts.some(c => c.senderId === data.contact.senderId);
          if (exists) return prevContacts;

          // Add new contact and sort
          const updatedContacts = [...prevContacts, data.contact].sort((a, b) => {
            const aTime = a.lastMessage?.Timestamp || a.createdAt;
            const bTime = b.lastMessage?.Timestamp || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });

          // Take only the first 6 contacts
          return updatedContacts.slice(0, 25);
        });
        break;

      case 'new_message': {
        const message = data.message;
        const messageKey = `${message.senderId}_${message.Timestamp}`;

        if (processedMessageIds.current.has(messageKey)) {
          return;
        }
        processedMessageIds.current.add(messageKey);

        const contactExists = contacts.some(
          (contact) => contact.senderId === message.senderId
        );

        if (!contactExists) {
          // Send a request to fetch contact details
          const wsService = wsServiceRef.current;
          if (wsService?.isConnected()) {
            const tenentId = localStorage.getItem('tenentid');
            wsService.sendMessage({
              type: 'fetch_contact_details',
              senderId: message.senderId,
              tenentId,
              message
            });
          }
        }

        // Update contacts list
        setContacts(prevContacts => {
          const updatedContacts = prevContacts.map(contact => {
            if (contact.senderId === message.senderId ||
              contact.senderId === message.recipientId) {
              return {
                ...contact,
                lastMessage: {
                  message: message.message,
                  response: message.response || '',
                  Timestamp: message.Timestamp,
                  messageType: message.messageType
                }
              };
            }
            return contact;
          });

          // Move the contact with new message to top
          return updatedContacts.sort((a, b) => {
            const aTime = a.lastMessage?.Timestamp || a.createdAt;
            const bTime = b.lastMessage?.Timestamp || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });
        });

        // Update messages if contact is selected
        if (selectedContact?.senderId === message.senderId) {
          setMessages(prevMessages => {
            // Check if message already exists
            if (!prevMessages.some(m => `${m.senderId}_${m.Timestamp}` === messageKey)) {
              const newMessages = [...prevMessages, message];
              setTimeout(scrollToBottom, 100);
              console.log("new");
              return newMessages;
            } else {
              console.log("old")
            }
            return prevMessages;
          });
        }
        updateContactLastMessage(data.message);
        break;
      }

      case 'contact_details': {
        if (data.contact) {
          const newContact: Contact = {
            _id: data.contact._id,
            username: data.contact.username,
            senderId: data.contact.senderId,
            createdAt: data.contact.createdAt || new Date().toISOString(),
            name: data.contact.name || data.contact.username,
            profile_pic: data.contact.profile_pic,
            chatMode: data.contact.chatMode || 'chat',
            lastMessage: data.contact.lastMessage ? {
              message: data.contact.lastMessage.message || '',
              response: data.contact.lastMessage.response || '',
              Timestamp: data.contact.lastMessage.Timestamp || new Date().toISOString(),
              messageType: data.contact.lastMessage.messageType || 'text'
            } : undefined
          };

          // Add the new contact to the contacts list
          setContacts(prevContacts => {
            // Prevent duplicate contacts
            const existingContactIndex = prevContacts.findIndex(
              contact => contact.senderId === newContact.senderId
            );

            if (existingContactIndex === -1) {
              const updatedContacts = [...prevContacts, newContact];
              const sortedContacts = updatedContacts.sort((a, b) => {
                const aTime = a.lastMessage?.Timestamp || a.createdAt;
                const bTime = b.lastMessage?.Timestamp || b.createdAt;
                return new Date(bTime).getTime() - new Date(aTime).getTime();
              });
              setShowLoadLess(sortedContacts.length > 25);
              return sortedContacts.slice(0, 25);
            }

            return prevContacts;
          });
        }
        break;
      }

      case 'search_results':
        setContacts(data.contacts);
        setLoading(false);
        break;

      case 'history':
        // Log history messages to help debug carousel rendering
        console.log('History Messages:', data.messages);
        data.messages.forEach(msg => {
          if (msg.messageType === 'carousel') {
            console.log('Carousel Message in History:', msg);
          }
        });
        setMessages([...data.messages].reverse());
        setTimeout(() => scrollToBottom(), 100);
        break;

      case 'chat_mode_update': {
        if (data.status === 'success' && data.data) {
          // Access only messageId since that's what's defined in our interface
          const messageId = data.messageId;
          if (messageId && processedModeUpdateIds.current.has(messageId)) {
            return;
          }
          if (messageId) {
            processedModeUpdateIds.current.add(messageId);
            setTimeout(() => {
              processedModeUpdateIds.current.delete(messageId);
            }, 5000);
          }

          const { senderId, mode } = data.data;
          setContacts(prevContacts => {
            // Only update if mode actually changed
            const updatedContacts = prevContacts.map(contact =>
              contact.senderId === senderId && contact.chatMode !== mode
                ? { ...contact, chatMode: mode }
                : contact
            );
            return updatedContacts;
          });

          if (selectedContact?.senderId === senderId) {
            setSelectedContact(prev =>
              prev && prev.chatMode !== mode
                ? { ...prev, chatMode: mode }
                : prev
            );
          }
        }
        break;
      }

      case 'chat_mode':
        console.log('Chat mode received:', data);
        if (data.status === 'success' && data.data !== null) {
          const { mode } = data.data;
          // Update the selected contact's chat mode
          if (selectedContact) {
            setSelectedContact(prev =>
              prev ? { ...prev, chatMode: mode } : null
            );

            // Also update the contact in the contacts list
            setContacts(prevContacts =>
              prevContacts.map(contact =>
                contact.senderId === selectedContact.senderId
                  ? { ...contact, chatMode: mode }
                  : contact
              )
            );
          }
        } else {
          console.error('Failed to get chat mode:', data.message);
        }
        break;

      case 'human_agent_contacts':
        if (Array.isArray(data.contacts)) {
          if ('totalCount' in data) {
            setTotalHumanAgentCount(data.totalCount);
          }
          setHumanAgentContacts(prevContacts => {
            // Merge new contacts with existing ones
            const newContacts = [...prevContacts];

            data.contacts.forEach(newContact => {
              const existingIndex = newContacts.findIndex(
                existing => existing.senderId === newContact.senderId
              );

              if (newContact.lastMessage) {
                let messageType: 'text' | 'image' | 'audio' | 'template' | 'video' | 'ig_reel' | 'ig_stroy' | 'carousel' = 'text';
                if (newContact.lastMessage.messageType) {
                  messageType = newContact.lastMessage.messageType as 'text' | 'image' | 'audio' | 'template' | 'video' | 'ig_reel' | 'ig_stroy' | 'carousel';
                }
                newContact.lastMessage = {
                  ...newContact.lastMessage,
                  messageType
                };
              }

              if (existingIndex === -1) {
                newContacts.push(newContact);
              }
            });

            // Sort contacts by timestamp before returning
            const sortedContacts = newContacts.sort((a, b) => {
              const aTime = a.lastMessage?.Timestamp || a.createdAt;
              const bTime = b.lastMessage?.Timestamp || b.createdAt;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
            setShowLoadLessHumanAgents(sortedContacts.length > 25);
            setHasMoreHumanAgents(prevContacts.length < data.totalCount);
            setIsLoadingMoreHumanAgents(false);

            return sortedContacts;
          });
          setLoading(false);
        }
        break;

      case 'error':
        console.error('WebSocket error:', data.message);
        break;
    }
  }, [selectedContact, scrollToBottom, updateContactLastMessage]);

  useEffect(() => {
    console.log('LiveChat component mounted');
    let isComponentMounted = true;
    const wsService = getWebSocketService();

    wsServiceRef.current = wsService;

    const messageHandler = (data: WebSocketMessage) => {
      if (!isComponentMounted) return;
      console.log('WebSocket message received:', data);
      handleWebSocketMessage(data);
    };

    wsService.addMessageHandler(messageHandler);

    const handleConnect = () => {
      if (!isComponentMounted) return;
      const tenentId = localStorage.getItem('tenentid');
      if (tenentId) {
        setTimeout(() => {
          if (isComponentMounted) {
            wsService.sendMessage({
              type: 'get_contacts',
              tenentId,
              page: 1,
              limit: 25
            });
          }
        }, 1000);
      }
    };
    wsService.onConnect(handleConnect);
    if (!wsService.isConnected()) {
      const appUrl = process.env.REACT_APP_API_URL || 'https://ddcf6bc6761a.ngrok-free.app';
      wsService.connect(appUrl);
    }
    return () => {
      console.log('LiveChat component unmounting');
      isComponentMounted = false;
      wsService.removeMessageHandler(messageHandler);
      processedModeUpdateIds.current.clear();
      processedMessageIds.current.clear();
    };
  }, [handleWebSocketMessage, contacts.length]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Remove old processed IDs periodically
      const cutoffTime = Date.now() - (5 * 60 * 1000); // 5 minutes
      processedMessageIds.current = new Set(
        Array.from(processedMessageIds.current).filter(
          id => Number(id.split('_')[0]) > cutoffTime
        )
      );
    }, 10 * 60 * 1000); // Run every 10 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  useEffect(() => {
    if (activeTab === 'humanAgent') {
      const wsService = wsServiceRef.current;
      if (wsService?.isConnected()) {
        const tenentId = localStorage.getItem('tenentid');
        if (tenentId) {
          setIsLoadingMoreHumanAgents(true);
          wsService.sendMessage({
            type: 'get_human_agent_contacts',
            tenentId,
            page: 1,
            limit: 25
          });
        }
      }
    }
  }, [activeTab]);

  useEffect(() => {
    console.log('Human agents state:', {
      hasMoreHumanAgents,
      humanAgentPage,
      humanAgentContactsCount: humanAgentContacts.length,
      showLoadLessHumanAgents
    });
  }, [hasMoreHumanAgents, humanAgentPage, humanAgentContacts, showLoadLessHumanAgents]);
  const sanitizeMongoData = (data: any): any => {
    if (data === null || data === undefined) {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(sanitizeMongoData);
    }
    
    if (typeof data === 'object') {
      // Handle MongoDB extended JSON format
      if (data.$numberDouble !== undefined) {
        return Number(data.$numberDouble);
      }
      if (data.$numberInt !== undefined) {
        return Number(data.$numberInt);
      }
      if (data.$numberLong !== undefined) {
        return Number(data.$numberLong);
      }
      if (data.$date !== undefined) {
        return new Date(data.$date);
      }
      
      // Recursively sanitize object properties
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = sanitizeMongoData(value);
      }
      return sanitized;
    }
    
    return data;
  };
  
  // Update your fetchOrders function
  const fetchOrders = async (): Promise<void> => {
    try {
      const tenentId = localStorage.getItem('tenentid');
      const senderId = selectedContact?.senderId;
  
      if (!senderId || !tenentId) {
        console.error("Missing senderId or tenentId");
        return;
      }
  
      // Use the summary endpoint for quick stats
      const summaryResponse = await fetch(
        `/api/orderdetailroute/orders/summary?senderId=${senderId}&tenentId=${tenentId}`
      );
      
      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch order summary');
      }
  
      const rawSummaryData = await summaryResponse.json();
      // FIX: Sanitize the data before using it
      const summaryData = sanitizeMongoData(rawSummaryData);
      
      // Get detailed orders if needed
      const ordersResponse = await fetch(
        `/api/orderdetailroute/orders?senderId=${senderId}&tenentId=${tenentId}&limit=10&includeStats=true`
      );
      
      if (!ordersResponse.ok) {
        throw new Error('Failed to fetch orders');
      }
  
      const rawOrdersData = await ordersResponse.json();
      // FIX: Sanitize the data before using it
      const ordersData = sanitizeMongoData(rawOrdersData);
      
      setLatestOrders(ordersData.orders || []);
      setTotalOrderCount(summaryData.totalOrders || 0);
      
      console.log('Order Summary:', summaryData);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

// Helper function to format timestamp
// Helper function to format timestamp - add proper typing
const formatOrderDate = (timestamp: string | number): string => {
  const date = new Date(parseInt(timestamp.toString()));
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Helper function to get status color - add proper typing
const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'shipped':
      return 'bg-blue-100 text-blue-800';
    case 'processing':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending':
      return 'bg-orange-100 text-orange-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
  const handleContactSelect = useCallback((contact: Contact) => {
    setSelectedContact(contact);

    const wsService = wsServiceRef.current;
    if (wsService?.isConnected()) {
      const tenentId = localStorage.getItem('tenentid');
      if (tenentId) {
        // Use 'init' type as it's expected by your backend
        wsService.sendMessage({
          type: 'init',
          senderId: contact.senderId,
          tenentId
        });
        wsService.sendMessage({
          type: 'get_chat_mode',
          senderId: contact.senderId,
          tenentId
        });
        // Clear existing messages while loading new ones
        setMessages([]);
      }
    }
  }, []);

  // Update message sending handler
  const handleSend = useCallback(async () => {
    const wsService = wsServiceRef.current;
    if (!selectedContact || !newMessage.trim() || sendingMessage || !wsService?.isConnected()) {
      return;
    }
    try {
      setSendingMessage(true);
      const tenentId = localStorage.getItem('tenentid');

      wsService.sendMessage({
        type: 'message',
        senderId: selectedContact.senderId,
        tenentId,
        message: newMessage.trim(),
        timestamp: new Date().toISOString()
      });
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  }, [selectedContact, newMessage, sendingMessage, scrollToBottom]);

  // Update chat mode change handler
  const handleChatModeChange = useCallback(async (senderId: string, newMode: 'chat' | 'human') => {
    const wsService = wsServiceRef.current;
    if (wsService?.isConnected()) {
      const tenentId = localStorage.getItem('tenentid');

      wsService.sendMessage({
        type: 'update_chat_mode',
        senderId,
        tenentId,
        chatMode: newMode
      });
    }
  }, []);

  const filteredContacts = contacts
    .filter(contact => {
      const searchTerms = searchQuery.toLowerCase();
      const name = contact.name?.toLowerCase() || '';
      const username = contact.username?.toLowerCase() || '';

      return name.includes(searchTerms) || username.includes(searchTerms);
    })
    .sort((a, b) => {
      const aTime = a.lastMessage?.Timestamp || a.createdAt;
      const bTime = b.lastMessage?.Timestamp || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (!isNaN(date.getTime())) {
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    }
    return '';
  };

  const formatLastMessageTime = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const now = new Date();

    // If message is from today
    if (messageDate.toDateString() === now.toDateString()) {
      return formatMessageTime(timestamp);
    }

    // If message is from yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    // If message is within the last week
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    if (messageDate > lastWeek) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[messageDate.getDay()];
    }
    // For older messages
    return messageDate.toLocaleDateString();
  };

  const DEFAULT_PROFILE_PIC = "https://cdn-icons-png.flaticon.com/512/6596/6596121.png";

  const shouldShowDate = (messages: Message[], currentIndex: number) => {
    if (currentIndex === 0) return true;

    const currentDate = new Date(messages[currentIndex].Timestamp).toDateString();
    const prevDate = new Date(messages[currentIndex - 1].Timestamp).toDateString();

    return currentDate !== prevDate;
  };

  const loadMoreContacts = useCallback(() => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);

    const wsService = wsServiceRef.current;
    if (wsService?.isConnected()) {
      const tenentId = localStorage.getItem('tenentid');
      if (tenentId) {
        wsService.sendMessage({
          type: 'get_contacts',
          tenentId,
          page: nextPage,
          limit: 25
        });
      }
    }
  }, [page]);

  const handleLoadLess = useCallback(() => {
    setContacts(prevContacts => {
      // Calculate how many pages we currently have
      const currentPages = Math.ceil(prevContacts.length / 25);

      // If we have more than one page, reduce by one page
      if (currentPages > 1) {
        const newContactCount = (currentPages - 1) * 25;
        const reducedContacts = prevContacts.slice(0, newContactCount);
        setShowLoadLess(reducedContacts.length > 25);
        setPage(currentPages - 1);
        return reducedContacts;
      }

      return prevContacts;
    });
  }, []);

  const loadMoreHumanAgents = useCallback(() => {
    setIsLoadingMoreHumanAgents(true);
    const nextPage = humanAgentPage + 1;
    setHumanAgentPage(nextPage);

    const wsService = wsServiceRef.current;
    if (wsService?.isConnected()) {
      const tenentId = localStorage.getItem('tenentid');
      if (tenentId) {
        // Add logging to debug
        console.log(`Fetching human agents page ${nextPage}`);
        wsService.sendMessage({
          type: 'get_human_agent_contacts',
          tenentId,
          page: nextPage,
          limit: 25
        });
      }
    }
  }, [humanAgentPage]);

  const handleLoadLessHumanAgents = useCallback(() => {
    setHumanAgentContacts(prevContacts => {
      // Calculate how many pages we currently have
      const currentPages = Math.ceil(prevContacts.length / 25);

      // If we have more than one page, reduce by one page
      if (currentPages > 1) {
        const newContactCount = (currentPages - 1) * 25;
        const reducedContacts = prevContacts.slice(0, newContactCount);
        setShowLoadLessHumanAgents(reducedContacts.length > 25);

        // Important: Reset humanAgentPage to prevent pagination issues
        setHumanAgentPage(1);

        // This is the key fix - explicitly set hasMoreHumanAgents to true
        // since we know there are more contacts to load after reducing
        setHasMoreHumanAgents(true);

        return reducedContacts;
      }

      return prevContacts;
    });
  }, []);

  const handleTemplateButtonClick = async (payload: string) => {
    if (payload === 'HUMAN_AGENT' && selectedContact) {
      await handleChatModeChange(selectedContact.senderId, 'human');
    }
    // Handle other button actions as needed
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // If query is empty, fetch default contacts
    if (!query.trim()) {
      const wsService = wsServiceRef.current;
      if (wsService?.isConnected()) {
        const tenentId = localStorage.getItem('tenentid');
        wsService.sendMessage({
          type: 'get_contacts',
          tenentId,
          page: 1,
          limit: 25
        });
      }
      return;
    }

    // Set new timeout for search
    const timeout = setTimeout(() => {
      const wsService = wsServiceRef.current;
      if (wsService?.isConnected()) {
        const tenentId = localStorage.getItem('tenentid');
        wsService.sendMessage({
          type: 'search_contacts',
          tenentId,
          query: query.trim()
        });
      }
    }, 300); // 300ms debounce

    setSearchTimeout(timeout);
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedContact || uploadingMedia) return;

    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    try {
        setUploadingMedia(true);
        const formData = new FormData();
       formData.append('image', file);
       formData.append('senderId', selectedContact.senderId);
       formData.append('tenentId', localStorage.getItem('tenentid') || '');

       // Ensure correct API URL
       const apiUrl = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || '';
       const uploadUrl = `${apiUrl}/api/uploadmediaRoutes/uploadmedia/image`;

       console.log("Uploading to URL:", uploadUrl);

       const response = await fetch(uploadUrl, {
           method: 'POST',
           body: formData,
       });

       if (!response.ok) {
           throw new Error('Failed to upload image');
       }

       //const data = await response.json();

       // Send message with Image URL
       
   } catch (error) {
       console.error('Error uploading image:', error);
       alert('Failed to upload image. Please try again.');
   } finally {
       setUploadingMedia(false);
   }
};

const handleHeartSend = async () => {
 if (!selectedContact || sendingMessage) return;
 
 try {
   setSendingMessage(true);
   
   // Send a heart emoji as a text message
   const messageData = {
     senderId: selectedContact.senderId,
     tenentId: localStorage.getItem('tenentid'),
     message: "❤️", // Heart emoji
     messageType: 'text'
   };
   
   const wsService = wsServiceRef.current;
   if (wsService?.isConnected()) {
     wsService.sendMessage({
       type: 'message',
       ...messageData
     });
   }
 } catch (error) {
   console.error('Error sending heart:', error);
   alert('Failed to send heart. Please try again.');
 } finally {
   setSendingMessage(false);
 }
};
const onEmojiClick = (emojiClickData: EmojiClickData) => {
 setNewMessage((prevMessage) => prevMessage + emojiClickData.emoji);
 setShowEmojiPicker(false);
};


// --- NEW: Component for the expired window indicator ---
const ChatWindowExpiredIndicator = () => (
    <div className="flex-shrink-0 p-4 border-t bg-white">
        <div className="flex items-center bg-yellow-100 border border-yellow-300 rounded-lg p-3">
            <div className="flex items-center">
                <Clock className="w-6 h-6 text-yellow-600 mr-3" />
                <div className="text-sm">
                    <p className="font-semibold text-yellow-800">Conversation window expired</p>
                    <p className="text-yellow-700">Use templates to re-engage the customer.</p>
                </div>
            </div>
        </div>
    </div>
);


  return (
    <div className="flex h-[91vh] overflow-hidden">
      {/* Left Sidebar - Contact List */}
      <div className="w-1/4 border-r bg-white p-4 overflow-hidden flex flex-col">
        <div className="mb-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-2"
            />
          </div>
        </div>
  
        {/* Contact Type Tabs */}
        <div className="flex mb-4 border-b w-full">
          <button
            className={`px-4 py-2 font-medium text-sm flex-1 whitespace-nowrap ${
              activeTab === 'all' 
                ? 'text-blue-500 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('all')}
          >
            <span className="truncate">All Contacts</span>
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm flex-1 whitespace-nowrap ${
              activeTab === 'humanAgent' 
                ? 'text-blue-500 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('humanAgent')}
          >
            <span className="truncate">Support Agents {totalHumanAgentCount > 0 && `(${totalHumanAgentCount})`}</span>
          </button>
        </div>
  
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : (
            <>
              {activeTab === 'humanAgent' ? (
                /* Human Agent Contacts */
                <>
                  {humanAgentContacts.length > 0 ? (
                    humanAgentContacts.map((contact) => (
                      <div 
                        key={contact._id}
                        onClick={() => handleContactSelect(contact)}
                        className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100 mb-2 ${
                          selectedContact?.senderId === contact.senderId ? 'bg-gray-100' : ''
                        }`}
                      >
                        <img
                          src={contact.profile_pic || DEFAULT_PROFILE_PIC}
                          alt={contact.name === "Nil" ? contact.username : contact.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_PROFILE_PIC;
                            e.currentTarget.onerror = null;
                          }}
                        />
                        <div className="ml-3 flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="font-medium truncate">
                              {contact.name === "Nil" ? contact.username : contact.name}
                            </div>
                            <div className="text-xs text-gray-500 flex-shrink-0">
                              {contact.lastMessage ? 
                                formatLastMessageTime(contact.lastMessage.Timestamp) : 
                                formatLastMessageTime(contact.createdAt)
                              }
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-[180px] inline-block">
                            {contact.lastMessage && (
                              contact.lastMessage.messageType === 'audio'
                                ? 'Voice message'
                                : contact.lastMessage.messageType === 'image'
                                  ? 'Image message'
                                  : contact.lastMessage.messageType === 'video'
                                    ? 'Video message'
                                    : contact.lastMessage.messageType === 'template'
                                      ? 'Template message'
                                      : contact.lastMessage.messageType === 'carousel'
                                        ? 'Product carousel'
                                        : contact.lastMessage.messageType === 'ig_reel'
                                          ? 'IG Reel message'
                                          : typeof contact.lastMessage.response === 'string'
                                            ? contact.lastMessage.response || contact.lastMessage.message
                                            : contact.lastMessage.message || 'No message'
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(contact.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-center p-4">
                      No support agents available
                    </div>
                  )}
                  {humanAgentContacts.length > 0 && (
                  <div className="mt-3 flex space-x-4">
                    {hasMoreHumanAgents && (
                      <Button
                        onClick={loadMoreHumanAgents}
                        disabled={isLoadingMoreHumanAgents}
                        className="flex-1 bg-white text-blue-500 hover:text-blue-600 border border-blue-500 hover:bg-blue-50"
                      >
                        {isLoadingMoreHumanAgents ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                        ) : (
                          'Load More'
                        )}
                      </Button>
                    )}
                    {showLoadLessHumanAgents && (
                      <Button
                        onClick={handleLoadLessHumanAgents}
                        className="flex-1 bg-white text-red-500 hover:text-red-600 border border-red-500 hover:bg-red-50"
                      >
                        Load Less
                      </Button>
                    )}
                  </div>
                  )}
                </>
              ) : (
                /* All Contacts */
                <>
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact._id}
                      onClick={() => handleContactSelect(contact)}
                      className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100 mb-2 ${
                        selectedContact?.senderId === contact.senderId ? 'bg-gray-100' : ''
                      }`}
                    >
                      <img
                        src={contact.profile_pic || DEFAULT_PROFILE_PIC}
                        alt={contact.name === "Nil" ? contact.username : contact.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_PROFILE_PIC;
                          e.currentTarget.onerror = null;
                        }}
                      />
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="font-medium truncate">
                            {contact.name === "Nil" ? contact.username : contact.name}
                          </div>
                          <div className="text-xs text-gray-500 flex-shrink-0">
                            {contact.lastMessage ? 
                              formatLastMessageTime(contact.lastMessage.Timestamp) : 
                              formatLastMessageTime(contact.createdAt)
                            }
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-[180px] inline-block">
                          {contact.lastMessage && (
                            contact.lastMessage.messageType === 'audio'
                              ? 'Voice message'
                              : contact.lastMessage.messageType === 'image'
                                ? 'Image message'
                                : contact.lastMessage.messageType === 'video'
                                  ? 'Video message'
                                  : contact.lastMessage.messageType === 'template'
                                    ? 'Template message'
                                    : contact.lastMessage.messageType === 'carousel'
                                      ? 'Product carousel'
                                      : contact.lastMessage.messageType === 'ig_reel'
                                        ? 'IG Reel message'
                                        : typeof contact.lastMessage.response === 'string'
                                          ? contact.lastMessage.response || contact.lastMessage.message
                                          : contact.lastMessage.message || 'No message'
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(contact.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <Button
                      onClick={loadMoreContacts}
                      disabled={isLoadingMore}
                      className="bg-white text-blue-500 hover:text-blue-600 border border-blue-500 hover:bg-blue-50"
                    >
                      {isLoadingMore ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  )}
                  {showLoadLess && (
                    <Button
                      onClick={handleLoadLess}
                      className="bg-white text-red-500 hover:text-red-600 border border-red-500 hover:bg-red-50"
                    >
                      Load Less
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
  
      {/* Right Panel - Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="flex-shrink-0 p-4 border-b bg-white">
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      {selectedContact.profile_pic ? (
        <img
          src={selectedContact.profile_pic}
          alt={selectedContact.name === "Nil" ? selectedContact.username : selectedContact.name}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
          {getInitials(selectedContact.name, selectedContact.username)}
        </div>
      )}
      <div className="ml-3">
        <div className="font-semibold">{selectedContact.name === "Nil" ? selectedContact.username : selectedContact.name}</div>
        
      </div>
    </div>
    
    {/* Chat Mode and Orders Controls */}
    <div className="flex items-center space-x-3">
      <select
        value={selectedContact.chatMode || 'chat'}
        onChange={(e) => handleChatModeChange(selectedContact.senderId, e.target.value as 'chat' | 'human')}
        className="border p-2 rounded-md text-sm shadow-md bg-white hover:border-blue-500 hover:bg-gray-100 focus:ring focus:ring-blue-200 transition-colors"
      >
        <option value="chat">🤖 Chatbot</option>
        <option value="human">🙎‍♂️ Human Agent</option>
      </select>
      
      <button
  onClick={() => {
    setShowOrderDetails(!showOrderDetails);
    if (!showOrderDetails) {
      fetchOrders();
    }
  }}
  className="border p-2 rounded-md text-sm shadow-md bg-white hover:border-blue-500 hover:bg-gray-100 focus:ring focus:ring-blue-200 transition-colors"
>
  {showOrderDetails ? (
    <>
      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      Hide Orders
    </>
  ) : (
    <>
      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      Orders
    </>
  )}
</button>
    </div>
  </div>

  {/* Order Details Panel */}
  {showOrderDetails && (
    <div className="mt-4 p-4 border-t bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Orders</h3>
        <span className="text-2xl font-bold text-blue-600">{totalOrderCount}</span>
      </div>
      
      {latestOrders.length > 0 ? (
        <div className="space-y-3">
          {/* Latest Order Highlight */}
          {latestOrders[0] && (
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">Latest Order</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(latestOrders[0].status)}`}>
                  {latestOrders[0].status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Order ID:</span>
                  <p className="font-medium">#{latestOrders[0].orderId}</p>
                </div>
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <p className="font-medium text-green-600">₹{latestOrders[0].total_amount}</p>
                </div>
                <div>
                  <span className="text-gray-600">Date:</span>
                  <p className="font-medium">{formatOrderDate(latestOrders[0].timestamp)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Payment:</span>
                  <p className="font-medium">{latestOrders[0].paymentStatus}</p>
                </div>
              </div>
              
              {latestOrders[0].tracking_number && (
                <div className="mt-2">
                  <span className="text-gray-600 text-xs">Tracking:</span>
                  <p className="font-mono text-sm">{latestOrders[0].tracking_number}</p>
                </div>
              )}
              
              <div className="flex space-x-2 mt-3">
                <button className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors">
                  View
                </button>
                <button className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors">
                  Details
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p>No orders found for this contact</p>
        </div>
      )}
    </div>
  )}
</div>
  
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="flex flex-col p-4 min-h-0">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-4">
                    No messages yet
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4">
                    {messages.map((message, index) => (
                      <div key={message._id}>
                        {shouldShowDate(messages, index) && (
                          <div className="flex justify-center my-4">
                            <div className="bg-gray-200 rounded-full px-4 py-1 text-sm text-gray-600">
                              {formatMessageDate(message.Timestamp)}
                            </div>
                          </div>
                        )}
                        
                        {message.messageType === 'carousel' ? (
                          <CarouselMessage
                            message={message as any}
                            isOutgoing={message.senderId !== selectedContact?.senderId}
                            onButtonClick={handleTemplateButtonClick}
                          />
                        ) : message.messageType === 'video' ? (
                          <VideoMessage
                            message={message}
                            selectedContact={selectedContact}
                            formatMessageTime={formatMessageTime}
                          />
                        ) : message.messageType === 'image' ? (
                          <ImageMessage
                            message={message}
                            selectedContact={selectedContact}
                            formatMessageTime={formatMessageTime}
                          />
                        ) : message.messageType === 'audio' ? (
                          <>
                            <AudioMessage 
                              audioUrl={message.audioUrl}
                              transcription={message.transcription}
                              timestamp={formatMessageTime(message.Timestamp)}
                              isOutgoing={message.senderId !== selectedContact?.senderId}
                              message={message.message}
                            />
                            {message.response && typeof message.response === 'string' && message.response !== 'Audio message' && message.response !== 'Carousel Message' && (
                              <div className="flex justify-end mb-3">
                                <div className="max-w-[350px] min-w-[100px] rounded-lg px-4 py-2 bg-blue-500 text-white">
                                  <p className="break-words">{message.response}</p>
                                  <div className="text-xs opacity-75 mt-1">
                                    {formatMessageTime(message.Timestamp)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : message.messageType === 'template' ? (
                          <TemplateMessage
                            message={message as unknown as TemplateMessageProps['message']}
                            isOutgoing={message.senderId !== selectedContact?.senderId}
                            onButtonClick={handleTemplateButtonClick}
                          />
                        ) : (
                          <>
                            <div className={`flex ${
                              message.senderId === selectedContact?.senderId 
                                ? 'justify-start' 
                                : 'justify-end'
                            } mb-3`}>
                              {message.message && (
                                <div className={`max-w-[350px] min-w-[200px] rounded-[20px] px-6 py-3 ${
                                  message.senderId === selectedContact?.senderId 
                                    ? 'bg-white shadow-md border border-gray-200' 
                                    : 'bg-blue-500 text-white'
                                }`}>
                                  <p className="break-words">
                                    {typeof message.message === 'string' ? message.message : ''}
                                  </p>
                                  <div className={`text-xs mt-2 ${
                                    message.senderId === selectedContact?.senderId 
                                      ? 'text-gray-500' 
                                      : 'text-white opacity-70'
                                  }`}>
                                    {formatMessageTime(message.Timestamp)}
                                  </div>
                                </div>
                              )}
                            </div>
  
                            {message.response && typeof message.response === 'string' && (
                              <div className="flex justify-end mb-3">
                                <div className="max-w-[350px] min-w-[200px] bg-blue-500 text-white rounded-[20px] px-6 py-3 shadow-md">
                                  <p className="break-words">{message.response}</p>
                                  <div className="text-xs opacity-75 mt-2">
                                    {formatMessageTime(message.Timestamp)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* --- UPDATED: Conditionally render message input or expired indicator --- */}
            {isWindowExpired ? (
                <ChatWindowExpiredIndicator />
            ) : (
                <div className="flex-shrink-0 p-4 border-t bg-white">
                    <div className="flex items-center">
                        <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-2">
                            <div className="relative">
                                <button
                                    className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none mr-2"
                                    title="Emoji"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                                </button>

                                {showEmojiPicker && (
                                    <div className="absolute bottom-10 left-0 z-10">
                                        <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} width={320} height={450} />
                                    </div>
                                )}
                            </div>

                            <Input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Message..."
                                className="flex-1 border-0 bg-transparent focus:ring-0 focus:outline-none text-base"
                                disabled={sendingMessage}
                            />

                            {!newMessage.trim() ? (
                                <div className="flex items-center">
                                    <label htmlFor="image-upload" className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer mx-1" title="Image">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                        <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleSend}
                                    disabled={sendingMessage}
                                    className="p-1 border-0 bg-transparent hover:bg-transparent text-blue-500 focus:ring-0 ml-1"
                                >
                                    {sendingMessage ?
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" /> :
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7Z"/></svg>
                                    }
                                </Button>
                            )}
                        </div>

                        {!newMessage.trim() && (
                            <button
                                className="ml-3 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                                title="Heart"
                                onClick={handleHeartSend}
                                disabled={sendingMessage}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a contact to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
