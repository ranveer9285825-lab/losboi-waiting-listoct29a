"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase"; 
import { Sparkles, Gift, Coins, CheckCircle } from "lucide-react";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Loading...");
    
    const { error } = await supabase
      .from("waitlist")
      .insert([{ email }]);

    if (error) {
      if (error.code === '23505') {
        setStatus("Aap pehle se hi jud chuke hain! 🎉");
      } else {
        setStatus("Kuch galat ho gaya.");
      }
    } else {
      setStatus("Badhai ho! Aapke 500 Coins lock ho gaye hain! 🎉");
      setEmail("");
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-6 bg-gradient-to-b from-amber-50 to-white text-center pb-24">
      
      {/* Badge */}
      <div className="mt-8 bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-xs font-bold mb-6 flex items-center gap-2">
        <Sparkles size={14} className="text-amber-500" />
        Early Access Rewards
      </div>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
        Final App Launch <br/> Par Payein <span className="text-amber-500">Extra Fayde</span>
      </h1>
      <p className="text-gray-500 mb-8 font-medium text-sm px-4">
        Agar aap abhi account nahi banana chahte, toh apna email dekar VIP list mein shamil hon.
      </p>

      {/* Rewards Box */}
      <div className="w-full max-w-sm bg-white p-5 rounded-2xl shadow-sm border border-amber-100 mb-8 text-left">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Gift size={18} className="text-amber-500"/> Waitlist Benefits:
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-sm text-gray-700 font-medium">
            <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5"/>
            <span><strong className="text-black">500 Loreo Coins</strong> bilkul free, premium kahaniyan padhne ke liye.</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-700 font-medium">
            <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5"/>
            <span><strong className="text-black">Creator Program</strong> mein sabse pehle judne ka mauka.</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-700 font-medium">
            <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5"/>
            <span>Launch hone par special <strong>Ad-Free 1 Month</strong> pass.</span>
          </li>
        </ul>
      </div>
      
      {/* Form */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input 
            type="email" 
            placeholder="Apna email darj karein..." 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 transition-all bg-white text-gray-900 placeholder-gray-400 font-bold text-sm shadow-sm"
          />
          <button 
            type="submit" 
            className="w-full bg-amber-500 text-white font-bold py-4 rounded-xl hover:bg-amber-600 transition-colors shadow-md flex justify-center items-center gap-2"
          >
            <Coins size={18} /> VIP List Mein Judein
          </button>
        </form>
        {status && (
          <div className={`mt-5 p-3 rounded-xl text-sm font-bold ${status.includes('galat') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
