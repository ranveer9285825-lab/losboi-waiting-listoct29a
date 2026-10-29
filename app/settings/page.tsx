"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, LogOut, ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    // SECURITY PASSWORD FOR LOGOUT (Tum ise change kar sakte ho)
    if (password !== "losboi123") {
      setError("Galat password! Logout allow nahi hai.");
      return;
    }
    
    setLoading(true);
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        </div>
      </header>

      <main className="p-5 max-w-md mx-auto space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-red-600">
            <ShieldAlert size={20} />
            <h2 className="font-bold">Developer Logout Area</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Testing ke liye logout karna hai? Niche security password enter karein.
          </p>

          <input 
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Logout password daalein"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 text-sm outline-none focus:border-red-500"
          />
          
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

          <button 
            onClick={handleLogout}
            disabled={loading}
            className="w-full bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:bg-red-700 transition"
          >
            <LogOut size={18} /> {loading ? "Logging out..." : "Secure Logout"}
          </button>
        </div>
      </main>
    </div>
  );
}
