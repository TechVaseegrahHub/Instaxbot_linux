import { Link } from "react-router-dom";

export default function TechProductTemplate() {
  return (
    <div className="h-screen bg-gradient-to-br from-gray-200 via-gray-50 to-gray-50 flex flex-col items-center justify-center px-4 relative">
      {/* Back Button - Mobile optimized position */}
      <Link
        to="/product-template"
        className="absolute md:top-4 md:left-16 top-10 left-[5rem] transform -translate-x-1/2 sm:absolute sm:top-20 sm:left-[17rem] px-6 py-2 bg-white text-gray-700 border border-pink-400 rounded-lg font-semibold hover:bg-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all duration-300 z-10 w-auto whitespace-nowrap"
      >
        ← Back
      </Link>
      
      {/* Main Content - Perfectly centered on mobile with more space between items */}
      <div className="w-full max-w-md p-6 bg-white/80 shadow-lg border border-gray-200 backdrop-blur-xl rounded-xl">
        <h1 className="text-xl font-bold text-gray-800 mb-8 text-center">
          Tech Providers Product Templates Page
        </h1>
        <div className="flex flex-col gap-8 mt-4">
          <Link
            to="/product-list-template-tech"
            className="px-5 py-3 text-black rounded-lg text-base font-semibold border border-pink-500 hover:bg-gradient-to-r hover:from-pink-400 hover:to-pink-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-300 transition-colors duration-300 text-center"
          >
            Go to Product List Template
          </Link>
          <Link
            to="/product-details-template-tech"
            className="px-5 py-3 text-black rounded-lg text-base font-semibold border border-pink-500 hover:bg-gradient-to-r hover:from-pink-400 hover:to-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-colors duration-300 text-center"
          >
            Go to Product Details Template
          </Link>
        </div>
      </div>
    </div>
  );
}