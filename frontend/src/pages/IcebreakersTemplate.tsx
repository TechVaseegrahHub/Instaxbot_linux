import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

export default function IcebreakersTemplate() {
 const [questions, setQuestions] = useState({
   question1: "",
   question2: "",
   question3: "",
   question4: ""
 });

 const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
   const { name, value } = e.target;
   setQuestions(prev => ({
     ...prev,
     [name]: value
   }));
 };

 const handleSend = async () => {
   // Check if any question is empty
   const emptyQuestions = Object.values(questions).some(q => !q.trim());
   
   if (emptyQuestions) {
     Swal.fire({
       icon: "error",
       title: "Empty Questions",
       text: "Please fill all 4 icebreaker questions before sending.",
     });
     return;
   }

   try {
     const tenentId = localStorage.getItem('tenentid');
     const response = await axios.post("https://8def-2401-4900-8827-18db-d531-34b1-a4f4-2ef9.ngrok-free.app/api/templatesroute/Icebreaker", {
       questions: Object.values(questions),
       tenentId
     });
     
     Swal.fire({
       icon: "success",
       title: "Questions Saved",
       text: response.data.message,
     });

     // Clear the form after successful submission
     setQuestions({
       question1: "",
       question2: "",
       question3: "",
       question4: ""
     });
   } catch (error) {
     Swal.fire({
       icon: "error",
       title: "Save Failed",
       text: "Failed to save questions. Please try again.",
     });
   }
 };

 return (
   <div className="min-h-screen bg-gray-100 flex items-center justify-center px-2 sm:px-4 -mt-12">
     <div className="relative text-center p-2 sm:p-3.5 bg-white shadow-lg backdrop-blur-lg rounded-xl w-full max-w-lg">
       <h1 className="text-xl sm:text-2xl font-[Poppins] font-bold text-pink-500 mb-2 sm:mb-2.5">Icebreakers Questions</h1>
       
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
 );
}