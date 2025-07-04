// utils/dateUtils.ts
export const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
  };