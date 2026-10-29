"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  Settings,
  Plus,
  Share2,
  MoreVertical,
  ArrowLeft,
  Grid,
  Bookmark,
  Camera,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import Link from "next/link";

type ProfileData = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  followers_count: number;
};

type Post = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  reads: number;
};

// Bulletproof Copy Helper
async function copyTextFallback(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
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

function Avatar({ src, name, size = 80 }: { src: string | null; name: string; size?: number }) {
  const style = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={style}
        className="rounded-full object-cover border-4 border-white shadow-sm bg-gray-100"
      />
    );
  }
  return (
    <div
      style={{ ...style, fontSize: size * 0.4 }}
      className="rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold flex items-center justify-center border-4 border-white shadow-sm select-none"
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileIdFromUrl = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");

  // Post Actions & Toast State
  const [activePostMenu, setActivePostMenu] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const isCreatorView = !profileIdFromUrl || Boolean(currentUser && currentUser.id === profileIdFromUrl);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user || null;
      if (isMounted) setCurrentUser(user ? { id: user.id } : null);

      const targetProfileId = profileIdFromUrl || user?.id;
      if (!targetProfileId) {
        if (isMounted) setLoading(false);
        return;
      }

      // 1. Fetch Profile Info
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetProfileId)
        .single();

      // 2. Fetch Real Followers Count directly from `follows` table
      const { count: realFollowersCount, error: countError } = await supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", targetProfileId);

      if (profileData && isMounted) {
        setProfile({
          ...profileData,
          followers_count:
            !countError && typeof realFollowersCount === "number"
              ? realFollowersCount
              : profileData.followers_count || 0,
        });
      }

      // 3. Check if logged-in user follows this profile
      if (user && user.id !== targetProfileId) {
        const { data: followData } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", targetProfileId)
          .maybeSingle();

        if (isMounted) setIsFollowing(Boolean(followData));
      } else if (isMounted) {
        setIsFollowing(false);
      }

      // 4. Fetch User's Posts
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, title, thumbnail_url, reads")
        .eq("author_id", targetProfileId)
        .order("created_at", { ascending: false });

      if (isMounted && postsData) setPosts(postsData);
      if (isMounted) setLoading(false);
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [profileIdFromUrl]);

  // Live Follow / Unfollow Handler
  const handleFollowToggle = async () => {
    if (followBusy) return;
    if (!currentUser) {
      showToast("Follow karne ke liye pehle login karein.");
      return;
    }
    if (!profile || profile.id === currentUser.id) return;

    setFollowBusy(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setProfile((p) =>
      p ? { ...p, followers_count: Math.max(0, p.followers_count + (wasFollowing ? -1 : 1)) } : null
    );

    const { error } = wasFollowing
      ? await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", profile.id)
      : await supabase
          .from("follows")
          .insert({ follower_id: currentUser.id, following_id: profile.id });

    if (error && error.code !== "23505") {
      setIsFollowing(wasFollowing);
      setProfile((p) =>
        p ? { ...p, followers_count: Math.max(0, p.followers_count + (wasFollowing ? 1 : -1)) } : null
      );
      showToast("Kuch gadbad hui: " + error.message);
    } else {
      showToast(wasFollowing ? "Unfollow ho gaya" : "Author ko follow kiya!");
    }
    setFollowBusy(false);
  };

  // Profile Share (Always includes ?id=profile.id)
  const handleShareProfile = async () => {
    if (!profile) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}/profile?id=${profile.id}` : "";
    const title = profile.full_name
      ? `${profile.full_name} (@${profile.username}) on Losboi`
      : `@${profile.username} on Losboi`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: `Read stories by @${profile.username} on Losboi`, url });
        return;
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
    }

    const copied = await copyTextFallback(url);
    showToast(copied ? "Profile link copy ho gaya!" : "Link copy nahi ho paya");
  };

  const handleDeletePost = async (postId: string) => {
    setActivePostMenu(null);
    if (window.confirm("Kya aap sach mein is kahani ko delete karna chahte hain?")) {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (!error) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        showToast("Post delete ho gayi.");
      } else {
        showToast("Delete nahi ho paya: " + error.message);
      }
    }
  };

  const handleSharePost = async (postId: string) => {
    setActivePostMenu(null);
    const url = typeof window !== "undefined" ? `${window.location.origin}/read?id=${postId}` : "";
    const title = `Story by @${profile?.username || "Author"} on Losboi`;

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

  const handleEditPost = (postId: string) => {
    setActivePostMenu(null);
    router.push(`/edit-post?id=${postId}`);
  };

  const handleFeatureSoon = () => showToast("Ye feature jaldi hi aayega!");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-black animate-spin" />
      </div>
    );
  }

  if (!profile && !profileIdFromUrl && !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Welcome to Losboi</h2>
        <p className="text-gray-500 mb-6">Apni profile dekhne ke liye login karein</p>
        <Link href="/auth" className="bg-black text-white px-8 py-3 rounded-full font-bold">
          Login / Sign Up
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <p className="text-gray-600 mb-4">Ye profile nahi mili.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold"
        >
          Wapas Jao
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] max-w-[90%] px-4 py-2.5 rounded-full bg-gray-900/95 text-white text-sm shadow-lg text-center">
          {toast}
        </div>
      )}

      {/* Cover */}
      <div className="relative h-48 bg-gray-200 w-full">
        {profile.cover_url ? (
          <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-gray-700 to-gray-900" />
        )}
        <div className="absolute top-0 w-full p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/40 to-transparent h-24">
          {isCreatorView ? (
            <Link
              href="/create"
              className="bg-black/30 backdrop-blur-md p-2.5 rounded-full text-white hover:bg-black/50 transition"
            >
              <Plus size={22} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-black/30 backdrop-blur-md p-2.5 rounded-full text-white hover:bg-black/50 transition"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          {isCreatorView ? (
            <Link
              href="/settings"
              className="bg-black/30 backdrop-blur-md p-2.5 rounded-full text-white hover:bg-black/50 transition"
            >
              <Settings size={22} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleShareProfile}
              className="bg-black/30 backdrop-blur-md p-2.5 rounded-full text-white hover:bg-black/50 transition"
            >
              <Share2 size={22} />
            </button>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-5 relative">
        <div className="absolute -top-12 flex justify-between w-[calc(100%-40px)] items-end">
          <div
            onClick={() => {
              if (isCreatorView) router.push("/edit");
            }}
            className={`relative group ${isCreatorView ? "cursor-pointer" : ""}`}
          >
            <Avatar src={profile.avatar_url} name={profile.username} size={90} />
            {isCreatorView && (
              <div className="absolute bottom-0 right-0 bg-black text-white p-1.5 rounded-full border-2 border-white">
                <Camera size={14} />
              </div>
            )}
          </div>
        </div>
        <div className="h-[60px]" />
        <div className="mb-4 mt-2">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {profile.full_name || profile.username}
          </h1>
          <p className="text-sm font-medium text-gray-500 mb-2">@{profile.username}</p>
          <p className="text-[14px] text-gray-800 leading-relaxed max-w-[90%] whitespace-pre-wrap">
            {profile.bio || "Abhi tak koi bio nahi likha hai..."}
          </p>
          <div className="flex gap-4 mt-3 text-[13px] font-medium text-gray-600">
            <span>
              <span className="font-bold text-gray-900">{profile.followers_count}</span> Followers
            </span>
            <span>
              <span className="font-bold text-gray-900">{posts.length}</span> Posts
            </span>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          {isCreatorView ? (
            <Link
              href="/edit"
              className="flex-1 bg-gray-100 text-gray-900 font-bold py-2.5 rounded-xl text-sm text-center border border-gray-200 active:bg-gray-200 transition"
            >
              Edit Profile
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleFollowToggle}
              disabled={followBusy}
              className={`flex-1 font-bold py-2.5 rounded-xl text-sm transition active:scale-95 shadow-sm ${
                isFollowing
                  ? "bg-gray-100 text-gray-800 border border-gray-200"
                  : "bg-blue-600 text-white"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
          <button
            type="button"
            onClick={handleShareProfile}
            className="bg-gray-100 text-gray-900 font-bold py-2.5 px-6 rounded-xl text-sm border border-gray-200 active:bg-gray-200 transition flex items-center justify-center"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-gray-200 sticky top-0 bg-gray-50 z-20">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`flex-1 py-3.5 flex justify-center items-center gap-2 border-b-2 transition-colors ${
              activeTab === "posts" ? "border-black text-black" : "border-transparent text-gray-400"
            }`}
          >
            <Grid size={20} />
          </button>
          {isCreatorView && (
            <button
              type="button"
              onClick={() => setActiveTab("saved")}
              className={`flex-1 py-3.5 flex justify-center items-center gap-2 border-b-2 transition-colors ${
                activeTab === "saved" ? "border-black text-black" : "border-transparent text-gray-400"
              }`}
            >
              <Bookmark size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="px-1 py-1">
        {activeTab === "posts" ? (
          posts.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-sm">
              Aapne abhi tak koi post nahi kiya hai.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="relative group cursor-pointer"
                  onClick={() => router.push(`/read?id=${post.id}`)}
                >
                  <div className="aspect-square bg-gray-200 relative overflow-hidden block">
                    {post.thumbnail_url ? (
                      <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-black flex p-2">
                        <span className="text-[10px] text-white/70 leading-tight font-serif line-clamp-3">
                          {post.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {isCreatorView && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePostMenu(post.id);
                      }}
                      className="absolute top-1 right-1 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/70 transition"
                    >
                      <MoreVertical size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-20 text-gray-500 text-sm">Saved stories yahan aayengi.</div>
        )}
      </div>

      {/* Post Action Bottom Sheet */}
      <div
        className={`fixed inset-0 z-[9999] ${activePostMenu ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!activePostMenu}
      >
        <div
          onClick={() => setActivePostMenu(null)}
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
            activePostMenu ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 bg-white shadow-2xl px-4 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out max-h-[85dvh] overflow-y-auto ${
            activePostMenu ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ borderRadius: "24px 24px 0 0" }}
        >
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-300" />
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => activePostMenu && handleSharePost(activePostMenu)}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] font-semibold text-gray-900 active:bg-gray-100"
            >
              <Share2 size={18} /> Share Post
            </button>
            <button
              type="button"
              onClick={() => activePostMenu && handleEditPost(activePostMenu)}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] font-semibold text-gray-900 active:bg-gray-100"
            >
              <Edit2 size={18} /> Edit Story
            </button>

            {/* Delete Post Button */}
            <button
              type="button"
              onClick={() => activePostMenu && handleDeletePost(activePostMenu)}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] font-bold text-red-600 active:bg-red-50"
            >
              <Trash2 size={18} /> Delete Post
            </button>

            <div className="h-px bg-gray-100 my-1 w-full" />

            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase">
              Visibility (Coming Soon)
            </div>
            <div className="flex gap-2 px-3 pb-3">
              <button
                type="button"
                onClick={handleFeatureSoon}
                className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 active:scale-95 transition"
              >
                <Eye size={20} />
                <span className="text-xs font-bold">Public</span>
              </button>
              <button
                type="button"
                onClick={handleFeatureSoon}
                className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 active:scale-95 transition"
              >
                <EyeOff size={20} />
                <span className="text-xs font-bold">Unlisted</span>
              </button>
              <button
                type="button"
                onClick={handleFeatureSoon}
                className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 active:scale-95 transition"
              >
                <Lock size={20} />
                <span className="text-xs font-bold">Private</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-black animate-spin" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
