import { Link } from "react-router-dom";

export default function EcommerceProductTemplate() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center md:-mt-16">
     {/* Back Button positioned at the top left - responsive for mobile */}
     <Link
        to="/product-template"
        className="absolute top-24 left-4 md:top-20 md:left-[17rem] px-4 md:px-6 py-2 bg-white text-black border-2 border-pink-200 rounded-lg font-semibold hover:bg-pink-100 transition-all duration-300 text-sm md:text-base"
      >
        ← Back
      </Link>
      {/* Main Card */}
      <div className="w-full max-w-xl px-4 md:px-0">
        <div className="bg-white shadow-lg px-4 md:px-6 py-4 md:py-5 rounded-xl">
          <h1 className="text-xl md:text-2xl font-bold text-black text-center">
            Ecommerce Product Templates Page
          </h1>
        </div>
        <div className="mt-4 p-4 md:p-6 space-y-3 md:space-y-4 bg-white rounded-xl shadow-lg">
          <Link
            to="/product-type-template"
            className="block w-full px-4 md:px-6 py-3 md:py-4 border-2 text-center border-pink-300 text-black rounded-lg text-base md:text-lg font-semibold hover:bg-pink-100 hover:border-pink-400 transition-colors duration-200"
          >
            Go to Product Type Template
          </Link>
        
          <Link
            to="/product-details-template"
            className="block w-full px-4 md:px-6 py-3 md:py-4 border-2 text-center border-pink-300 text-black rounded-lg text-base md:text-lg font-semibold hover:bg-pink-100 hover:border-pink-400 transition-colors duration-200"
          >
            Go to Product Details Template
          </Link>
        </div>
      </div>
    </div>
  );
}
