import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import InstaxbotLogo from '../assets/Instaxbot_Logo.png';

const words: string[] = ['Automate', 'Grow', 'Engage', 'Analyze'];

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [wordIndex] = useState<number>(0);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.post('https://app.instaxbot.com/api/auth/login', {
        email,
        password,
      });

      if (response.status === 200) {
        const tenentId = response.data.tenentId;
        const token = response.data.token;
        const wstoken = response.data.wstoken;
        const isAdmin = response.data.isAdmin;
        const blocked = response.data.blocked;
        console.log('Logged in successfully. Tenant ID:', tenentId, token);
        
        localStorage.setItem('tenentid', tenentId);
        localStorage.setItem('token', token);
        localStorage.setItem('wstoken', wstoken);
        localStorage.setItem('isAdmin', isAdmin);
        localStorage.setItem('blocked', blocked);
        console.log('blocked:', blocked);
        
        if (isAdmin) {
          navigate('/admin');
        } else {
          if(blocked) {
            navigate('/login');
          } else {
            navigate('/dashboard');
          }
        }
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('Login Error:', {
          message: err.message,
          status: err.response?.status,
          responseData: err.response?.data,
          url: err.config?.url
        });
        setError(err.response?.data?.error || 'Invalid email or password');
      } else {
        console.error('Unexpected error during login:', err);
        setError('An unexpected error occurred');
      }
    }
  };

  const handleTermsClick = () => {
    navigate('/frontterms');
  };

  const handlePrivacyClick = () => {
    navigate('/frontpolicy');
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-b from-pink-300 to-purple-300 md:bg-none">
      <div className="relative w-full md:max-w-md bg-white p-6 md:p-8 flex flex-col justify-between shadow-lg rounded-lg m-auto md:mt-24 md:m-0 md:shadow-none md:rounded-none max-w-sm md:max-w-md">
        <div className="absolute top-0 left-0 w-full h-2 rounded-t-md md:rounded-t-none"></div>
        <div>
          <div className="flex items-center mb-4 md:mb-8">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mr-3 md:-mt-32">
            <img
              src={InstaxbotLogo}
              alt="Logo"
              className="w-14 h-14 object-contain"
            />
          </div>

           <h1 className="text-3xl md:text-4xl md:-mt-32 font-bold bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent">
            InstaX bot
          </h1>

          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-gray-800">Log in</h2>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-gray-300 border-pink-200 focus:border-pink-500 focus:ring-pink-500"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-gray-300 pr-10 border-pink-200 focus:border-pink-500 focus:ring-pink-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-pink-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-2 rounded-md shadow-md">Log In</Button>
          </form>
        </div>
        <div className="text-center mb-6">
          <span className="text-gray-600">Don't have an account? </span>
          <button className="text-pink-600 font-medium hover:underline" onClick={() => navigate('/signup')}>
            Sign up
          </button>
        </div>
        <div className="flex justify-center space-x-4 text-sm mt-4">
          <button onClick={handleTermsClick} className="text-gray-500 hover:text-pink-600 hover:underline">
            Terms & Conditions
          </button>
          <span className="text-gray-500">•</span>
          <button onClick={handlePrivacyClick} className="text-gray-500 hover:text-pink-600 hover:underline">
            Privacy Policy
          </button>
        </div>
      </div>  

      <div className="hidden md:flex w-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-8 md:p-12 items-center justify-center">
        <div className="text-white max-w-2xl">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 md:mb-8">
            Instagram
            <br />
            Automation
            <br />
            <span className="inline-block w-[300px]">{words[wordIndex]}</span>
          </h2>
          <p className="text-xl md:text-2xl mb-8 md:mb-12 leading-relaxed">
            Boost your Instagram presence with our powerful automation tools. Grow your audience, engage with followers, and analyze your performance - all in one place.
          </p>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex -space-x-4">
              {['A', 'B', 'C'].map((letter, i) => (
                <div key={i} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/30 border-2 md:border-3 border-white flex items-center justify-center text-lg md:text-xl font-bold">
                  {letter}
                </div>
              ))}
            </div>
            <span className="text-lg md:text-xl">Join thousands of successful Instagram creators</span>
          </div>
        </div>
      </div>
    </div>
  );
}