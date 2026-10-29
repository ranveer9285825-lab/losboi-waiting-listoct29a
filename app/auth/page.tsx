"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Mail, Lock, User, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // Sirf signup ke liye

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Login successful, redirect to profile
        router.push("/profile");
        
      } else {
        // --- SIGNUP LOGIC ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username, // Ye metadata mein save hoga
            }
          }
        });

        if (error) throw error;

        // Supabase default settings me email confirmation on hota hai
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError("Ye email pehle se registered hai.");
        } else {
          setMessage("Account ban gaya! Check your email for confirmation (ya agar auto-confirm ON hai to seedha login karein).");
          // Agar email confirmation band hai, to seedha redirect kar sakte ho
          setTimeout(() => setIsLogin(true), 3000); 
        }
      }
    } catch (err: any) {
      setError(err.message || "Kuch galat ho gaya, wapas try karein.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="p-4 flex items-center">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-200 transition text-gray-700">
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-20">
        <div className="w-full max-w-sm mx-auto">
          {/* Titles */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? "Welcome back" : "Create Account"}
          </h1>
          <p className="text-gray-500 mb-8">
            {isLogin ? "Apne Loreo account mein login karein" : "Loreo par apni kahaniyan likhna shuru karein"}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {!isLogin && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username (e.g. ranveer)"
                  className="w-full bg-white border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                />
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Mail size={20} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-white border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black transition"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Lock size={20} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                className="w-full bg-white border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black transition"
              />
            </div>

            {/* Error or Success Messages */}
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
            {message && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100">{message}</div>}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-bold rounded-xl py-3.5 mt-2 active:scale-[0.98] transition disabled:opacity-70 flex justify-center items-center h-14"
            >
              {loading ? (
                <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                isLogin ? "Login" : "Sign Up"
              )}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
              className="text-sm font-medium text-gray-600 hover:text-black transition"
            >
              {isLogin ? "Naya account banana hai? Sign Up" : "Pehle se account hai? Login karein"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
