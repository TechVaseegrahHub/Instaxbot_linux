import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import InstaxbotLogo from '../assets/Instaxbot_Logo.png';

const words: string[] = ['Automate', 'Grow', 'Engage', 'Analyze'];

export default function SignupPage(): JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [wordIndex] = useState<number>(0);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.post('https://ddcf6bc6761a.ngrok-free.app/api/auth/signup', {
        name,
        email,
        password,
        verificationCode
      });

      if (response.status === 201) {
        alert(response.data.alertMessage);
        navigate('/login');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setError(err.response.data.error);
      } else {
        setError('Error registering user. Please try again.');
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
    <>
     {/* Mobile view (hidden on sm and larger screens) */}
      <div className="sm:hidden flex flex-col min-h-screen bg-gradient-to-br from-purple-300 to-pink-200">
        <div className="flex flex-col justify-center items-center min-h-screen">
          <div className="w-[98%] max-w-[400px] bg-white rounded-lg shadow-md p-5 mx-auto">
            {/* Updated logo and name section for mobile */}
            <div className="flex items-center mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mr-2">
                <img
                  src={InstaxbotLogo}
                  alt="Logo"
                  className="w-14 h-14 object-contain"
                />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent">
                InstaX bot
              </h1>
            </div>
      
            <h2 className="text-xl font-bold mb-4">Sign up</h2>
            
            <form className="space-y-3" onSubmit={handleSignUp}>
              <div>
                <Label htmlFor="name-mobile" className="text-gray-700 text-sm">Name</Label>
                <Input
                  id="name-mobile"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-gray-200 bg-gray-50 h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="email-mobile" className="text-gray-700 text-sm">Email</Label>
                <Input
                  id="email-mobile"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-gray-200 bg-gray-50 h-9"
                />
              </div>

              <div>
                <Label htmlFor="code-mobile" className="text-gray-700 text-sm">Verification Code</Label>
                <Input
                  id="code-mobile"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter verification code"
                  className="border-gray-200 bg-gray-50 h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="password-mobile" className="text-gray-700 text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password-mobile"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-gray-200 bg-gray-50 pr-10 h-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              {error && <p className="text-red-500 text-xs">{error}</p>}
              
              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1.5 rounded-md h-9 mt-1"
              >
                Sign up
              </Button>
            </form>
            
            <div className="text-center mt-4 text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <button 
                className="text-purple-600 hover:underline font-medium" 
                onClick={() => navigate('/login')}
              >
                Log in
              </button>
            </div>
            
            <div className="flex justify-center space-x-2 text-xs mt-4">
              <button 
                onClick={handleTermsClick} 
                className="text-gray-500 hover:text-purple-600"
              >
                Terms & Conditions
              </button>
              <span className="text-gray-500">•</span>
              <button 
                onClick={handlePrivacyClick} 
                className="text-gray-500 hover:text-purple-600"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Desktop view (hidden on xs screens) */}
      <div className="hidden sm:flex flex-row min-h-screen">
        <div className="w-full sm:max-w-md bg-white p-8 flex flex-col justify-between order-2 sm:order-1">
          <div>
            {/* Updated logo and name section for desktop */}
            <div className="flex items-center mb-8">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mr-3">
                <img
                  src={InstaxbotLogo}
                  alt="Logo"
                  className="w-14 h-14 object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent">
                InstaX bot
              </h1>
            </div>
            
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Sign up</h2>
            <form className="space-y-4" onSubmit={handleSignUp}>
              <div>
                <Label htmlFor="name" className="text-gray-700">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-gray-300"
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="text-gray-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-gray-300"
                />
              </div>

              <div>
                <Label htmlFor="code" className="text-gray-700">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter verification code"
                  className="border-gray-300"
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
                    className="border-gray-300 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              {error && <p className="text-red-500">{error}</p>}
              
              <Button 
                type="submit" 
                className="w-full bg-purple-600 text-white"
              >
                Create account
              </Button>
            </form>
            
            <div className="text-center mt-6">
              <span className="text-gray-600">Already have an account? </span>
              <button className="text-purple-600 hover:underline" onClick={() => navigate('/login')}>
                Log in
              </button>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4 text-sm mt-6 sm:mt-0">
            <button onClick={handleTermsClick} className="text-gray-500 hover:text-purple-600 hover:underline">
              Terms & Conditions
            </button>
            <span className="text-gray-500">•</span>
            <button onClick={handlePrivacyClick} className="text-gray-500 hover:text-purple-600 hover:underline">
              Privacy Policy
            </button>
          </div>
        </div>

        <div className="w-full sm:w-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-8 sm:p-12 flex items-center justify-center order-1 sm:order-2">
          <div className="text-white max-w-2xl text-center sm:text-left">
            <h2 className="text-4xl sm:text-6xl font-bold mb-6 sm:mb-8 leading-tight sm:leading-[1.2]">
              Instagram
              <br />
              Automation
              <br />
              <span className="inline-block sm:w-[300px]">{words[wordIndex]}</span>
            </h2>
            <p className="text-lg sm:text-2xl mb-8 sm:mb-12 leading-relaxed">
              Boost your Instagram presence with our powerful automation tools. Grow your audience, engage with followers, and analyze your performance - all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="flex justify-center sm:justify-start -space-x-4">
                {['A', 'B', 'C'].map((letter, i) => (
                  <div key={i} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/30 border-3 border-white flex items-center justify-center text-lg sm:text-xl font-bold">
                    {letter}
                  </div>
                ))}
              </div>
              <span className="text-lg sm:text-xl mt-2 sm:mt-0 text-white text-center sm:text-left">
                Join thousands of successful Instagram creators
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

