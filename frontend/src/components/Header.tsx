import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getWebSocketService } from '../Services/websocketService';
import NotificationIcon from './NotificationIcon';

interface WebSocketNotificationMessage {
  type: string;
  status: 'success' | 'error';
  data: any;
}

const Header = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [agentMode, setAgentMode] = useState<string>('offline');

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: WebSocketNotificationMessage) => {
    console.log('WebSocket message received:', data); // Debugging log

    if (data.type === 'main_chat_mode_updated' && data.status === 'success') {
      const { mainmode } = data.data as { mainmode: string };
      setAgentMode(mainmode);
      console.log(`Main chat mode updated to: ${mainmode}`);
    } else {
      console.warn('Unexpected WebSocket message type or status:', data);
    }
  }, []);

  useEffect(() => {
    const fetchUsername = async () => {
      const tenentId = localStorage.getItem('tenentid');
      try {
        const response = await axios.get(
          'https://app.instaxbot.com/api/usernameroute/username',
          { params: { tenentId } }
        );

        if (response.data) {
          setUsername(response.data.username);
        } else {
          console.error('Failed to fetch username');
        }
      } catch (error) {
        console.error('Error fetching username:', error);
      } finally {
        setLoading(false);
      }
      try {
        const response1 = await axios.get(
          'https://app.instaxbot.com/api/mainmoderoute/mainmode',
          { params: { tenentId } }
        );

        if (response1.data) {
          setAgentMode(response1.data.mainmode);
        } else {
          console.error('Failed to fetch AgentMode');
        }
      } catch (error) {
        console.error('Error fetching AgentMode:', error);
      }
    };

    fetchUsername();
  }, []);

  useEffect(() => {
    const wsService = getWebSocketService();

    if (wsService?.isConnected()) {
      wsService.addMessageHandler(handleWebSocketMessage);
    }

    return () => {
      wsService?.removeMessageHandler(handleWebSocketMessage);
    };
  }, [handleWebSocketMessage]);

  const handleMainModeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    setAgentMode(selectedValue);

    const wsService = getWebSocketService();
    const tenentId = localStorage.getItem('tenentid');

    if (wsService?.isConnected() && tenentId) {
      try {
        wsService.sendMessage({
          type: 'main_chat_mode_update',
          tenentId,
          mainmode: selectedValue,
          timestamp: new Date().toISOString(),
        });

        console.log('Main mode update sent:', selectedValue);
      } catch (error) {
        console.error('Error updating main mode:', error);
      }
    } else {
      console.error('WebSocket not connected or tenant ID missing');
    }
  };

  return (
    <header className="bg-gradient-to-r from-purple-600 to-pink-500 shadow-md w-full z-10 h-16 md:h-15">
      {/* Mobile view - with Agent Mode selector and Notification icon directly in header */}
      <div className="flex items-center justify-between px-4 py-3 md:hidden h-14">
        {/* Left side - username */}
        <div className="flex items-center">
          <span className="text-white font-medium truncate max-w-[150px] text-lg top-3 ml-10">
            {loading ? 'Loading...' : username || 'Peararutselvi'}
          </span>
        </div>

        {/* Right side - controls with proper spacing */}
        <div className="flex items-center space-x-4">
          {/* Mode selector with cleaner styling */}
          <div className="relative">
            <select
              value={agentMode}
              onChange={handleMainModeChange}
              className="mt-2 w-15 pl-2 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black text-md focus:outline-none appearance-none"
            >
              <option value="online">👨‍💼 Online Agent</option>
              <option value="offline">🤖 Offline</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 top-3 md:right-4 right-0 flex items-center px-2 text-gray-600">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06 0L10 10.92l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Notification icon */}
          <div className="relative flex items-center justify-center cursor-pointer">
            <NotificationIcon />
          </div>
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden md:flex items-center justify-between mr-10 px-6 py-3">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold text-white">
            {loading ? 'Loading...' : username ? `Welcome ${username}` : 'Welcome Guest'}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={agentMode}
            onChange={handleMainModeChange}
            className="px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="offline" className="text-black">
              🤖 Offline
            </option>
            <option value="online" className="text-black">
              🙎‍♂️ Online Agent
            </option>
          </select>

          {/* Desktop notification icon */}
          <div className="relative w-8 h-8 flex items-center justify-center shadow-sm cursor-pointer">
            <div className="w-5 h-5 mt-4 md:-mt-6 text-gray-700">
              <NotificationIcon />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
