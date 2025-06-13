import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/Firebase-config';
import { onAuthStateChanged } from 'firebase/auth';

export default function Embed() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsChecking(false);
      // Only allow navigation after auth state is confirmed
      if (user) {
        navigate('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'instagramConnected') {
        // Perform any actions needed after Instagram connection
        console.log('Instagram account successfully connected!');
        // Optionally refresh the page or update the UI
        window.location.reload();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleGetStarted = () => {
    // First check if user is already authenticated
    const tenantId = localStorage.getItem('tenentid');

    const instagramOAuthUrl =
    'https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&' +
        `client_id=1628360401362198&redirect_uri=https://app.instaxbot.com/api/instagram_authroute/auth/instagram/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments&state=${tenantId || ''}`; // Navigate to provided URL or default to '/dashboard'

    const popupWidth = 600;
    const popupHeight = 700;
    const popupLeft = window.screenX + (window.innerWidth - popupWidth) / 2;
    const popupTop = window.screenY + (window.innerHeight - popupHeight) / 2;

    window.open(
      instagramOAuthUrl,
      'InstagramOAuth',
      `width=${popupWidth},height=${popupHeight},left=${popupLeft},top=${popupTop},resizable,scrollbars`
    );
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-t-4 border-pink-500 border-solid rounded-full animate-spin"></div>
          <p className="mt-4 text-lg font-medium text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-0 sm:-mt-16">
      <div className="text-center bg-white shadow-xl p-6 sm:p-12 rounded-2xl max-w-md w-full mx-auto border border-pink-100">
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-tr from-pink-400 to-purple-500 flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-8 sm:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-[Poppins] text-gray-800 mb-2">InstaX Bot</h1>
          <div className="h-1 w-16 bg-gradient-to-r from-pink-400 to-purple-500 mx-auto rounded-full mb-4 sm:mb-6"></div>
        </div>
        
        <p className="text-base sm:text-lg text-gray-600 font-[Poppins] mb-6 sm:mb-8 leading-relaxed">
          Automate your Instagram interactions and grow your audience with our powerful AI assistant!
        </p>
        
        <button
          onClick={handleGetStarted}
          className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 text-base sm:text-lg font-semibold disabled:opacity-50 transition-all duration-300 font-[Poppins] shadow-md hover:shadow-lg transform hover:-translate-y-1 flex items-center justify-center space-x-2"
          disabled={isChecking}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Connect Instagram</span>
        </button>
        
        <div className="mt-8 sm:mt-10 text-center">
          <p className="text-xs sm:text-sm text-gray-500 font-[Poppins] mb-3 sm:mb-4">
            By connecting, you agree to our Terms of Service
          </p>
          <a
            href="/policy"
            className="text-pink-500 font-[Poppins] text-xs sm:text-sm hover:text-pink-700 hover:underline transition-all duration-300 inline-flex items-center"
          >
            Privacy Policy
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}