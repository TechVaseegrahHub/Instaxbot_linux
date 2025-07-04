// websocketService.ts
export class WebSocketService {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private messageHandlers: ((data: any) => void)[] = [];
  private connectHandlers: (() => void)[] = [];
  
  private token: string;
  private isAuthenticated: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private isIntentionalClosure: boolean = false;

  constructor(token: string) {
    this.token = token;
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token available');
      WebSocketService.instance = new WebSocketService(token);
    }
    return WebSocketService.instance;
  }

  public connect(appUrl: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }
    
    if (this.socket?.readyState === WebSocket.CONNECTING) {
      return;
    }
  
    this.isIntentionalClosure = false;
    try {
      const url = new URL(appUrl);
      const websocketUrl = `wss://${url.host}/ws`;
      
      this.socket = new WebSocket(websocketUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        if (!this.isAuthenticated) {
          this.sendAuthMessage();
        }
        this.connectHandlers.forEach(handler => handler());
      };

      this.socket.onmessage = (event: MessageEvent) => {
  try {
    const data = JSON.parse(event.data);
    console.log('WebSocket received message:', data);
    if (data.type === 'new_contact') {
      console.log('New contact websocket message received:', data);
    }
    this.messageHandlers.forEach(handler => handler(data));
  } catch (error) {
    console.error('Error parsing message:', error);
  }
};

      this.socket.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
      };

      this.socket.onclose = (event: CloseEvent) => {
        this.handleDisconnect(event, appUrl);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  private handleDisconnect(event: CloseEvent, appUrl: string): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    
    if (!this.isIntentionalClosure && this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      console.log(`Attempting to reconnect in ${delay}ms...`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(appUrl);
      }, delay);
    }
  }

  public onConnect(handler: () => void): void {
    this.connectHandlers = this.connectHandlers.filter(h => h !== handler);
    this.connectHandlers.push(handler);
    if (this.isConnected()) {
      handler();
    }
  }

  private sendAuthMessage(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'auth',
        wstoken: this.token
      });
    }
  }

  public addMessageHandler(handler: (data: any) => void): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    this.messageHandlers.push(handler);
    console.log('Added message handler, total handlers:', this.messageHandlers.length);
  }

  public removeMessageHandler(handler: (data: any) => void): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  public sendMessage(message: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message);
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Message not sent:', message);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.isIntentionalClosure = true;
      this.socket.close();
      this.socket = null;
      this.messageHandlers = [];
      this.reconnectAttempts = 0;
      this.isAuthenticated = false;
    }
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public reconnect(appUrl: string): void {
    this.isIntentionalClosure = false;
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect(appUrl);
  }
  
}

// Helper function to get WebSocket service instance
export const getWebSocketService = (): WebSocketService => {
  return WebSocketService.getInstance();
};