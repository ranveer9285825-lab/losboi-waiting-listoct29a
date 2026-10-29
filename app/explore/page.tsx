"use client";
import { Search, TrendingUp, Hash } from "lucide-react";

export default function Explore() {
  const trendingTags = ["Mystery", "Romance", "Horror", "Slice of Life", "Thriller", "Sci-Fi"];

  return (
    <div className="bg-white min-h-screen pb-24 font-sans p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Explore</h1>
      
      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Stories, authors, tags search karein..." 
          className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm font-medium"
        />
      </div>

      {/* Trending Tags */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-600"/> Trending Categories
        </h2>
        <div className="flex flex-wrap gap-2">
          {trendingTags.map((tag, idx) => (
            <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Suggested Creators */}
      <div>
        <h2 className="text-sm font-bold text-gray-800 mb-3">Top Storytellers</h2>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-300">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Creator${i}`} alt="creator" className="rounded-full" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">Creator {i}</p>
                  <p className="text-xs text-gray-500">24 Stories published</p>
                </div>
              </div>
              <button className="bg-black text-white text-xs font-bold px-4 py-1.5 rounded-full">Follow</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
