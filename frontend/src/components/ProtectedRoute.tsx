import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  element: React.ReactElement;
  path?: string;
  bypassTokenCheck?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  element, 
  path, 
  bypassTokenCheck = false 
}) => {
  const location = useLocation();

  // Move the function definition before it's used
  const isInInstagram = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }

    const userAgent = navigator.userAgent || '';
    const vendor = navigator.vendor || '';

    return /Instagram/i.test(userAgent) || 
           /Instagram/i.test(vendor) || 
           /\b(IG|Instagram)\b/i.test(userAgent);
  };

  useEffect(() => {
    // Now isInInstagram is defined before being called
    console.group('ProtectedRoute Debug');
    console.log('Current Path:', location.pathname);
    console.log('Bypass Token Check:', bypassTokenCheck);
    console.log('Token Available:', !!localStorage.getItem('token'));
    console.log('Is Instagram:', isInInstagram());
    console.groupEnd();
  }, [location, bypassTokenCheck]);

  // Bypass token check for specific routes or scenarios
  if (bypassTokenCheck) {
    return React.cloneElement(element, { path, bypassTokenCheck });
  }

  const token = localStorage.getItem('token');
  
  // If no token and not in Instagram, redirect to login
  if (!token && !isInInstagram()) {
    console.error('Authentication Failed', {
      path: location.pathname,
      token: !!token,
      isInInstagram: isInInstagram()
    });
    
    return <Navigate 
      to="/login" 
      state={{ from: location }} 
      replace 
    />;
  }

  // Render the protected element
  return React.cloneElement(element, { path });
};

export default ProtectedRoute;