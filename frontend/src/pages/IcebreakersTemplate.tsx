import { useState } from "react";
import { ChevronLeft } from "lucide-react";

export default function IcebreakersTemplate() {
  const [questions, setQuestions] = useState({
    question1: "",
    question2: "",
    question3: "",
    question4: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuestions((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBack = () => {
    try {
      // Check if there's browser history to go back to
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Fallback options when no history is available
        
        // Option 1: Try to navigate to a parent route
        const currentPath = window.location.pathname;
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        if (parentPath && parentPath !== currentPath) {
          window.location.href = parentPath;
          return;
        }
        
        // Option 2: Navigate to a common dashboard/home route
        const commonRoutes = ['/', '/dashboard', '/home', '/main'];
        for (const route of commonRoutes) {
          try {
            window.location.href = route;
            return;
          } catch (e) {
            continue;
          }
        }
        
        // Option 3: Show a message if all else fails
        alert("Unable to navigate back. Please use your browser's back button or navigate manually.");
      }
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback to browser's back button
      window.history.back();
    }
  };

  const handleSend = async () => {
    try {
      console.log("Saving questions:", questions);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      alert("Questions saved successfully!");
      setQuestions({
        question1: "",
        question2: "",
        question3: "",
        question4: ""
      });
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save questions. Please try again.");
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-3 sm:p-8">
      {/* Back Button - Same position as WebsiteUrlConfiguration */}
      <button
        onClick={handleBack}
        className="inline-block mb-6 ml-4 px-4 py-2 bg-white text-black-600 rounded-md font-medium hover:bg-pink-50 shadow-sm transition-all duration-300 border border-pink-200 flex items-center gap-2"
      >
        <ChevronLeft size={18} className="text-gray-600" />
        Back
      </button>

      {/* Main Content */}
      <div className="flex items-center justify-center">
        <div className="relative text-center p-2 sm:p-3.5 bg-white shadow-lg backdrop-blur-lg rounded-xl w-full max-w-lg">
          <h1 className="text-xl sm:text-2xl font-[Poppins] font-bold text-pink-500 mb-2 sm:mb-2.5">
            Icebreakers Questions
          </h1>
          <div className="space-y-1.5 sm:space-y-2">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="p-1 bg-pink-100 rounded-lg">
                <h1 className="text-xs sm:text-sm font-semibold text-black mb-0.5 sm:mb-1 text-left pl-2">
                  Question {num}
                </h1>
                <textarea
                  name={`question${num}`}
                  value={questions[`question${num}` as keyof typeof questions]}
                  onChange={handleChange}
                  placeholder={`Enter icebreaker question #${num}...`}
                  className="w-full p-1.5 sm:p-2 resize-none rounded-lg border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm sm:text-base"
                  rows={1}
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSend}
            className="mt-3 sm:mt-4 px-5 sm:px-7 py-1.5 hover:py-2 hover:bg-gradient-to-r hover:from-pink-500 hover:to-pink-400 font-serif hover:text-white hover:border-0 rounded-full text-sm sm:text-base font-semibold bg-white text-pink-600 border-4 border-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-300"
          >
            Save Icebreakers Questions
          </button>
        </div>
      </div>
    </div>
  );
}
