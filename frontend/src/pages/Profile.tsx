import { motion } from 'framer-motion'
import { LogOut, Instagram } from 'lucide-react'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../config/Firebase-config'
import { useState, useEffect } from 'react'
import axios from 'axios'

// Configure axios defaults
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true'
axios.defaults.headers.common['Access-Control-Allow-Origin'] = '*'
axios.defaults.withCredentials = false

interface ProfileData {
  username: string;
  name: string;
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
}

const slideIn = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.5 } }
}

export default function Profile() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = async () => {
    try {
      const tenentId = localStorage.getItem('tenentid');
      if (!tenentId) {
        throw new Error('Required identifiers not found in local storage');
      }
      const response = await axios.get(
        'https://8def-2401-4900-8827-18db-d531-34b1-a4f4-2ef9.ngrok-free.app/api/profileroute/profile',
        {
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
          },
          params: {
            tenentId,     // Add tenentId as query parameter
             // Add instagramId as query parameter
          },
          withCredentials: false,
        }
      );

      console.log('Raw API response:', response);
      
      if (response.data === "error") {
        console.error('Backend returned error response', response);
        setError('Failed to fetch profile data');
        return;
      }
      
      if (response.data && (response.data.username || response.data.data?.username)) {
        const profileInfo = {
          username: response.data.username || response.data.data?.username || 'N/A',
          name: response.data.name || response.data.data?.name || 'N/A'
        };
        console.log('Processed profile data:', profileInfo);
        setProfileData(profileInfo);
        setError(null);
      } else {
        console.error('Invalid data structure:', response.data);
        setError('Invalid data received from server');
      }
    } catch (error: any) {
      console.error('Error fetching profile data:', error.response?.data || error.message);
      if (error.response) {
        console.log('Error response status:', error.response.status);
        console.log('Error response data:', error.response.data);
      }
      setError(error.message || 'Failed to fetch profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const retryFetch = () => {
    setLoading(true);
    setError(null);
    fetchProfileData();
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      <div className="container mx-auto p-6 space-y-8">
        <motion.header
          variants={slideIn}
          className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
           Instagram Profile
          </h1>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-600 hover:text-red-700 hover:bg-red-100"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </motion.header>

        <motion.div
          variants={slideIn}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8"
        >
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="text-center p-8">
              <p className="text-red-500 mb-4">{error}</p>
              <Button 
                variant="outline"
                onClick={retryFetch}
                className="hover:bg-purple-50"
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-purple-100 text-purple-600 text-xl">
                  {profileData?.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Instagram className="h-5 w-5 text-pink-600" />
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {profileData?.username || 'N/A'}
                  </h2>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  {profileData?.name || 'N/A'}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}