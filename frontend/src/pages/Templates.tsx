import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Templates() {
  const [, setIsMobileView] = useState(false);
  
  // Detect mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 w-full">
      {/* Back Button added here, matching the previous file's structure */}
      <Link
        to="/setting" // This navigates to the settings page
        className="inline-block mb-6 ml-4 px-4 py-2 bg-white text-black-600 rounded-md font-medium hover:bg-pink-50 shadow-sm transition-all duration-300 border border-pink-200"
      >
        ← Back
      </Link>
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white shadow-lg px-4 sm:px-6 py-4 sm:py-5 rounded-xl">
          <h1 className="text-xl sm:text-2xl font-bold text-black text-center">Templates Page</h1>
        </div>
        <div className="mt-3 sm:mt-4 p-4 sm:p-6 space-y-3 sm:space-y-4 bg-white rounded-xl shadow-lg">
          <Link
            to="/welcomepage"
            className="block w-full px-4 sm:px-6 py-3 sm:py-4 border-2 text-center border-pink-300 text-black rounded-lg text-base sm:text-lg font-semibold hover:bg-pink-100 hover:border-pink-400 transition-colors duration-200"
          >
            Go to Welcome Message Template
          </Link>
          <Link
            to="/product-template"
            className="block w-full px-4 sm:px-6 py-3 sm:py-4 border-2 text-center border-pink-300 text-black rounded-lg text-base sm:text-lg font-semibold hover:bg-pink-100 hover:border-pink-400 transition-colors duration-200"
          >
            Go to Product Template
          </Link>
        </div>
      </div>
    </div>
  );
}
