import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CategoryCarousel = ({ categories, selectedCategory, onCategorySelect }) => {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 300);
    }
  };

  React.useEffect(() => {
    checkScrollButtons();
    
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [categories]);

  return (
    <div className="relative mb-6">
      {/* Left Arrow */}
      <button
        onClick={scrollLeft}
        className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 transition-opacity ${
          canScrollLeft ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
        }`}
        disabled={!canScrollLeft}
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>

      {/* Categories Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide space-x-4 mx-10 pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={checkScrollButtons}
      >
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategorySelect(category)}
            className={`flex-shrink-0 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
              selectedCategory === category
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Right Arrow */}
      <button
        onClick={scrollRight}
        className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 transition-opacity ${
          canScrollRight ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
        }`}
        disabled={!canScrollRight}
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>

      {/* Custom CSS to hide scrollbar */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

// Instructions for integration:
// 1. Add this CategoryCarousel component to your ProductCatalog.tsx file
// 2. Replace the existing category navigation section with:
// <CategoryCarousel 
//   categories={categories}
//   selectedCategory={selectedCategory}
//   onCategorySelect={setSelectedCategory}
// />

// Example showing how to use it in your ProductCatalog
const ProductCatalogWithCarousel = () => {
  const [selectedCategory, setSelectedCategory] = useState('Herbal Tea');
  
  const categories = [
    'Herbal Tea',
    'Baby Care',
    'Carrier Oils',
    'Carrier oils',
    'Country Jaggery',
    'Eco Accessories',
    'Edible Oils',
    'Hair Care',
    'Health Care',
    'Honey',
    'Organic Spices',
    'Personal Care',
    'Wellness'
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Product Catalog</h1>
      
      <CategoryCarousel 
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />
      
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Selected Category:</h2>
        <p className="text-lg text-blue-600">{selectedCategory}</p>
      </div>
    </div>
  );
};

export default ProductCatalogWithCarousel;