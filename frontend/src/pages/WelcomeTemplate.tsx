import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";

export default function WelcomeTemplate() {
  const [message, setMessage] = useState("");
  
  const handleSend = async () => {
    if (!message.trim()) {
      Swal.fire({
        icon: "error",
        title: "Empty Message",
        text: "Please enter a welcome message before sending.",
      });
      return;
    }
    
    try {
      const tenentId = localStorage.getItem('tenentid');
      const response = await axios.post("https://app.instaxbot.com/api/templatesroute/welcome", {
        message, tenentId
      });
      Swal.fire({
        icon: "success",
        title: "Message Sent",
        text: response.data.message,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Send Failed",
        text: "Failed to send message. Please try again.",
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-16 sm:-mt-16">
      {/* Back Button positioned at the top left */}
      <Link
        to="/templates"
        className="fixed sm:absolute top-24 left-4 sm:top-20 sm:left-[17rem] px-4 py-2 bg-white text-black rounded-xl font-medium hover:bg-pink-100 border-2 border-pink-300 transition-all duration-300 flex items-center gap-1 z-10"
      >
        ← Back
      </Link>
      
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white shadow-lg px-4 sm:px-6 py-5 rounded-xl">
          <h1 className="text-xl sm:text-2xl font-bold text-black text-center">Welcome Message Template</h1>
        </div>
        
        <div className="mt-4 p-4 sm:p-6 space-y-4 bg-white rounded-xl shadow-lg">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your welcome message..."
            className="w-full h-40 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-pink-300 focus:outline-none text-gray-700 placeholder-gray-400 transition-all duration-200 text-sm sm:text-base"
          ></textarea>
          
          <button
            onClick={handleSend}
            className="block w-full px-4 py-3 sm:px-6 sm:py-4 rounded-lg border-2 text-center border-pink-300 text-black text-base sm:text-lg font-semibold hover:bg-pink-100 hover:border-pink-400 transition-colors duration-200"
          >
            Save Welcome Message
          </button>
        </div>
      </div>
    </div>
  );
}