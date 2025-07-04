// src/utils/AuthPatch.ts

declare global {
  interface Window {
    cs?: {
      getInstance: (bypassCheck?: boolean) => any;
      [key: string]: any;
    };
  }
}

// This script patches the existing authentication service to support bypass mode
export function patchAuthService(): void {
  // Wait for the 'cs' object to be available in the global scope
  const checkInterval = setInterval(() => {
    if (window.cs) {
      clearInterval(checkInterval);
      
      // Store the original getInstance method
      const originalGetInstance = window.cs.getInstance;
      
      // Override the getInstance method
      window.cs.getInstance = function(bypassCheck?: boolean) {
        // If bypassCheck is true, return a mock instance
        if (bypassCheck === true) {
          return {
            // Mock any methods that might be called
            getToken: () => "guest-token",
            makeRequest: (url: string, options?: RequestInit) => fetch(url, options),
            // Add any other methods used by your app
          };
        }
        
        // Otherwise, call the original method
        return originalGetInstance.call(this, bypassCheck);
      };
      
      console.log("Authentication service patched successfully");
    }
  }, 100);
  
  // Don't wait forever
  setTimeout(() => clearInterval(checkInterval), 5000);
}