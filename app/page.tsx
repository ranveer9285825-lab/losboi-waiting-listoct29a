"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, MoreVertical, Share2, Eye, User, Bookmark, HeartCrack, Award } from "lucide-react";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Views ko K, M mein format karne ka function (Smart Algorithmic Boost Logic)
function formatFakeViews(realReads: number) {
  let displayViews = 0;

  if (realReads === 0 || !realReads) {
    displayViews = 0;
  } else if (realReads <= 10) {
    displayViews = realReads * 4 + 3;
  } else if (realReads <= 50) {
    displayViews = realReads * 7 + 12;
  } else {
    displayViews = realReads * 12 + 45;
  }

  if (displayViews >= 1_000_000) return `${(displayViews / 1_000_000).toFixed(1)}M`;
  if (displayViews >= 1_000) return `${(displayViews / 1_000).toFixed(1)}K`;
  return String(displayViews);
}

// Bulletproof Copy Helper (StackBlitz aur sabhi browsers ke liye)
async function copyTextFallback(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback to textarea below
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Avatar Component
function Avatar({ src, name, size = 32 }: { src?: string | null; name: string; size?: number }) {
  const style = { width: size, height: size, minWidth: size };
  if (src) {
    return <img src={src} alt={name} style={style} className="rounded-full object-cover bg-gray-200 border border-gray-100" />;
  }
  return (
    <div
      style={{ ...style, fontSize: size * 0.4 }}
      className="rounded-full bg-gradient-to-br from-rose-400 to-orange-400 text-white font-semibold flex items-center justify-center select-none shadow-sm"
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

type HomePost = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  author_id: string | null;
  category: string;
  imageUrl: string | null;
  realReads: number;
  authorAvatar: string | null;
};

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Novels");
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [loading, setLoading] = useState(true);

  // Current User & Followed Authors State
  const [meId, setMeId] = useState<string | null>(null);
  const [followedAuthors, setFollowedAuthors] = useState<string[]>([]);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);

  // Home Page ke 3-Dot Menu aur Toast ke liye state
  const [activeMenuPost, setActiveMenuPost] = useState<HomePost | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchPostsAndFollows() {
      setLoading(true);

      // 1. Check current user & their followed authors
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
      if (!cancelled) setMeId(user?.id ?? null);

      if (user) {
        const { data: followRows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        if (!cancelled && followRows) {
          setFollowedAuthors(followRows.map((r) => String(r.following_id)));
        }
      } else if (!cancelled) {
        setFollowedAuthors([]);
      }

      // 2. Fetch posts
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id, content, type, title, category, created_at, thumbnail_url, reads, author_id,
          profiles (username, avatar_url)
        `)
        .eq("type", activeTab === "Novels" ? "episode" : "text_post")
        .order("created_at", { ascending: false });

      if (!cancelled && !error) {
        const formattedPosts: HomePost[] =
          data?.map((post) => {
            const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
            return {
              id: String(post.id),
              title: post.title || "Bina Title Ki Kahani",
              excerpt: post.content || "",
              author: profile?.username || "Unknown",
              author_id: post.author_id ? String(post.author_id) : null,
              category: post.category || "General",
              imageUrl: post.thumbnail_url || null,
              realReads: Number(post.reads || 0),
              authorAvatar: profile?.avatar_url || null,
            };
          }) || [];
        setPosts(formattedPosts);
      }
      if (!cancelled) setLoading(false);
    }

    fetchPostsAndFollows();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // Follow Handler (Follow karte hi button permanent gayab ho jayega)
  const handleQuickFollow = async (e: React.MouseEvent, authorId: string | null) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authorId || followBusyId === authorId) return;
    if (!meId) {
      showToast("Follow karne ke liye pehle login karein.");
      return;
    }
    if (authorId === meId) return;

    setFollowBusyId(authorId);
    // Turant UI se Follow button gayab karo
    setFollowedAuthors((prev) => (prev.includes(authorId) ? prev : [...prev, authorId]));

    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: meId, following_id: authorId });

    // 23505 = duplicate key (agar pehle se follow tha)
    if (error && error.code !== "23505") {
      setFollowedAuthors((prev) => prev.filter((id) => id !== authorId));
      showToast("Follow nahi ho paya: " + error.message);
    } else {
      showToast("Author ko follow kiya!");
    }
    setFollowBusyId(null);
  };

  const handleShare = async () => {
    if (!activeMenuPost) return;
    const postToShare = activeMenuPost;
    setActiveMenuPost(null);

    const url = typeof window !== "undefined" ? `${window.location.origin}/read?id=${postToShare.id}` : "";
    const title = `Read "${postToShare.title}" on Losboi`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: title, url });
        return;
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
    }

    const copied = await copyTextFallback(url);
    showToast(copied ? "Story link copy ho gaya!" : "Link copy nahi ho paya");
  };

  const handleViewProfile = () => {
    const targetAuthorId = activeMenuPost?.author_id;
    setActiveMenuPost(null);
    if (targetAuthorId) {
      router.push(`/profile?id=${targetAuthorId}`);
    }
  };

  const handleComingSoon = (featureName: string) => {
    setActiveMenuPost(null);
    showToast(`${featureName} jaldi hi aayega!`);
  };

  return (
    <div className="bg-white min-h-screen pb-24 font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] max-w-[90%] px-4 py-2.5 rounded-full bg-gray-900/95 text-white text-sm shadow-lg text-center">
          {toast}
        </div>
      )}

      <header className="flex justify-between items-center px-4 pt-5 pb-3">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-serif italic">Losboi</h1>

        <div className="flex items-center gap-1.5 text-gray-700 text-xs font-bold px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200 shadow-sm cursor-pointer active:scale-95 transition">
          <Award size={14} className="text-amber-500" />
          <span>Novice</span>
        </div>
      </header>

      <div className="flex border-b border-gray-100 mx-4 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab("Novels")}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-all ${
            activeTab === "Novels" ? "text-black border-b-2 border-black" : "text-gray-400"
          }`}
        >
          Novels
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("Chats")}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-all ${
            activeTab === "Chats" ? "text-black border-b-2 border-black" : "text-gray-400"
          }`}
        >
          Chats
        </button>
      </div>

      <div className="px-4 flex flex-col gap-8">
        {loading ? (
          <div className="flex justify-center mt-10">
            <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center mt-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Search className="text-gray-300" size={32} />
            </div>
            <p className="text-gray-800 font-bold text-lg">Abhi yahan kuch nahi hai</p>
          </div>
        ) : (
          posts.map((post) => {
            const isOwnPost = Boolean(meId && post.author_id && meId === post.author_id);
            const isFollowed = Boolean(post.author_id && followedAuthors.includes(post.author_id));
            const showFollowBtn = Boolean(post.author_id && !isOwnPost && !isFollowed);

            return (
              <Link
                href={`/read?id=${post.id}`}
                key={post.id}
                className="flex flex-col bg-white mb-2 pb-6 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition block cursor-pointer group"
              >
                {/* 16:9 Thumbnail */}
                <div className="w-full aspect-video relative mb-3 overflow-hidden rounded-xl shadow-sm border border-gray-100 bg-gray-100">
                  <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm z-10">
                    {post.category}
                  </span>
                  {post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center p-6">
                      <span className="text-white font-serif text-2xl text-center line-clamp-3 opacity-80">
                        {post.title}
                      </span>
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-bold text-gray-900 leading-tight mb-2 line-clamp-2 px-1">
                  {post.title}
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4 px-1">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between px-1 mt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar src={post.authorAvatar} name={post.author} size={32} />
                    <span className="text-sm font-bold text-gray-800 truncate">@{post.author}</span>
                    <span className="text-gray-300 text-xs">•</span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 shrink-0">
                      <Eye size={12} /> {formatFakeViews(post.realReads)}
                    </span>
                  </div>

                  {/* Right Actions: Follow Button (disappears after follow) + 3-Dot Menu */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {showFollowBtn && (
                      <button
                        type="button"
                        onClick={(e) => handleQuickFollow(e, post.author_id)}
                        disabled={followBusyId === post.author_id}
                        className="h-8 px-4 rounded-full bg-blue-600 text-white text-xs font-semibold active:scale-95 transition shadow-sm"
                      >
                        Follow
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveMenuPost(post);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-800 active:bg-gray-100 rounded-full transition"
                    >
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* --- Home Page Action Menu Sheet --- */}
      <div
        className={`fixed inset-0 z-50 ${activeMenuPost ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!activeMenuPost}
      >
        <div
          onClick={() => setActiveMenuPost(null)}
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
            activeMenuPost ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 bg-white shadow-2xl px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${
            activeMenuPost ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ borderRadius: "24px 24px 0 0" }}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" />
          <div className="flex flex-col">
            <button
              type="button"
              onClick={handleViewProfile}
              className="w-full text-left px-3 py-3.5 rounded-xl text-[15px] font-semibold text-gray-900 active:bg-gray-100 flex items-center gap-3"
            >
              <User size={18} className="text-gray-500" /> View Author Profile
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="w-full text-left px-3 py-3.5 rounded-xl text-[15px] font-semibold text-gray-900 active:bg-gray-100 flex items-center gap-3"
            >
              <Share2 size={18} className="text-gray-500" /> Share Everywhere
            </button>

            <div className="h-px bg-gray-100 my-1 w-full" />

            <button
              type="button"
              onClick={() => handleComingSoon("Save to Library")}
              className="w-full text-left px-3 py-3.5 rounded-xl text-[15px] font-semibold text-gray-900 active:bg-gray-100 flex flex-col justify-center"
            >
              <div className="flex items-center gap-3">
                <Bookmark size={18} className="text-gray-500" /> Save to Library
              </div>
              <span className="text-[10px] text-gray-400 font-medium ml-8 -mt-1 uppercase tracking-wider">
                Coming Soon
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleComingSoon("Not Interested")}
              className="w-full text-left px-3 py-3.5 rounded-xl text-[15px] font-semibold text-gray-900 active:bg-gray-100 flex flex-col justify-center"
            >
              <div className="flex items-center gap-3">
                <HeartCrack size={18} className="text-gray-500" /> Not Interested
              </div>
              <span className="text-[10px] text-gray-400 font-medium ml-8 -mt-1 uppercase tracking-wider">
                Coming Soon
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
