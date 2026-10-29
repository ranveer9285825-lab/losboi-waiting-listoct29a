"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Eye, Heart, Share2, Sun, Moon, Flag, MessageCircle } from "lucide-react";
import ReportSheet from "../components/report/ReportSheet";

/* ------------------------------ Types ------------------------------ */
type Story = {
  id: string;
  title: string;
  content: string;
  thumbnail_url: string | null;
  category: string | null;
  reads: number;
  author_id: string | null;
  username: string;
  avatar_url: string | null;
};

type CommentItem = {
  id: string;
  user_id: string | null;
  username: string;
  avatar_url: string | null;
  text: string;
  created_at: string;
  parent_id: string | null;
  likes: number;
  liked: boolean;
};

type ReplyTarget = { rootId: string; username: string; mention: boolean };

/* ----------------------------- Helpers ----------------------------- */
// Sirf marketing ke liye: waitlist stage me views/likes ka base badhake dikhaya jaata hai.
function getFakeViewsNumber(realReads: number) {
  if (realReads === 0 || !realReads) return 0;
  if (realReads <= 10) return realReads * 4 + 3;
  if (realReads <= 50) return realReads * 7 + 12;
  return realReads * 12 + 45;
}

function formatNumber(num: number) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) return String((err as { message: unknown }).message);
  return "unknown error";
}

function timeAgo(iso: string) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ${hr === 1 ? "hour" : "hours"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ${day === 1 ? "day" : "days"} ago`;
  if (day < 30) {
    const w = Math.floor(day / 7);
    return `${w} ${w === 1 ? "week" : "weeks"} ago`;
  }
  if (day < 365) {
    const mo = Math.floor(day / 30);
    return `${mo} ${mo === 1 ? "month" : "months"} ago`;
  }
  const y = Math.floor(day / 365);
  return `${y} ${y === 1 ? "year" : "years"} ago`;
}

function Avatar({ src, name, size }: { src?: string | null; name: string; size: number }) {
  const style = { width: size, height: size, minWidth: size };
  if (src) {
    return <img src={src} alt={name} style={style} className="rounded-full object-cover bg-gray-200 border border-gray-100" />;
  }
  return (
    <div
      style={{ ...style, fontSize: size * 0.42 }}
      className="rounded-full bg-gradient-to-br from-rose-400 to-orange-400 text-white font-semibold flex items-center justify-center select-none shadow-sm"
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function CommentRow({
  c,
  dark,
  isReply,
  onLike,
  onReply,
}: {
  c: CommentItem;
  dark: boolean;
  isReply?: boolean;
  onLike: (c: CommentItem) => void;
  onReply: (c: CommentItem) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Avatar src={c.avatar_url} name={c.username} size={isReply ? 26 : 34} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>{c.username}</span>
          <span className="text-[11px] text-gray-400">{timeAgo(c.created_at)}</span>
        </div>
        <p className={`text-[14px] leading-snug mt-0.5 break-words whitespace-pre-wrap ${dark ? "text-gray-300" : "text-gray-800"}`}>{c.text}</p>
        <div className="flex items-center gap-5 mt-1.5">
          <button
            onClick={() => onLike(c)}
            className={`flex items-center gap-1 text-xs active:scale-95 transition ${c.liked ? "text-rose-600" : "text-gray-400"}`}
          >
            <Heart size={14} fill={c.liked ? "currentColor" : "none"} />
            {c.likes > 0 && <span className="font-semibold">{formatNumber(c.likes)}</span>}
          </button>
          <button onClick={() => onReply(c)} className="text-xs font-semibold text-gray-400 active:text-gray-600">
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main reader                                                         */
/* ------------------------------------------------------------------ */
export default function ReadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [story, setStory] = useState<Story | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [meId, setMeId] = useState<string | null>(null);

  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Asli like (database me save hota hai)
  const [storyLiked, setStoryLiked] = useState(false);
  const [realLikes, setRealLikes] = useState(0);

  // Sheets
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);

  // Comment / reply / report
  const [newComment, setNewComment] = useState("");
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [posting, setPosting] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [liveIndex, setLiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const anySheetOpen = commentSheetOpen || menuOpen || reportSheetOpen;
  const dark = isDarkMode;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    if (!id) router.replace("/");
  }, [id, router]);

  /* ------------------------------ Load ------------------------------ */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles(username, avatar_url)")
        .eq("id", id)
        .single();
      if (cancelled) return;

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      const authorId: string | null = data.author_id ?? data.user_id ?? null;

      setStory({
        id: String(data.id),
        title: data.title ?? "",
        content: data.content ?? data.body ?? "",
        thumbnail_url: data.thumbnail_url ?? data.cover_url ?? data.image_url ?? null,
        category: data.category ?? null,
        reads: Number(data.reads ?? 0),
        author_id: authorId,
        username: profile?.username ?? "Unknown",
        avatar_url: profile?.avatar_url ?? null,
      });

      // Read count: ek browser session me ek story sirf ek baar gini jaati hai
      try {
        const key = `read_counted_${data.id}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          supabase.rpc("increment_reads", { post_id: data.id }).then(() => {});
        }
      } catch {
        /* sessionStorage unavailable */
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
      if (cancelled) return;
      setMeId(user?.id ?? null);

      // Follow status
      if (user && authorId) {
        const { data: followData } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", authorId)
          .maybeSingle();
        if (!cancelled) setFollowing(!!followData);
      }

      // Story likes (asli count + maine like kiya ya nahi)
      const { count } = await supabase
        .from("post_likes")
        .select("user_id", { count: "exact", head: true })
        .eq("post_id", id);
      if (!cancelled) setRealLikes(count ?? 0);

      if (user) {
        const { data: mine } = await supabase
          .from("post_likes")
          .select("user_id")
          .eq("post_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) setStoryLiked(!!mine);
      }

      // Comments (profile alag se laate hain taaki foreign key ki zaroorat na ho)
      const { data: commentsData, error: cErr } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (cErr) showToast("Couldn't load comments: " + cErr.message);

      const rows = commentsData ?? [];
      const userIds = Array.from(new Set(rows.map((c) => c.user_id).filter(Boolean))) as string[];
      const commentIds = rows.map((c) => c.id);

      const profileMap: Record<string, { username: string | null; avatar_url: string | null }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds);
        (profs ?? []).forEach((p) => {
          profileMap[String(p.id)] = { username: p.username, avatar_url: p.avatar_url };
        });
      }

      const likeCount: Record<string, number> = {};
      const likedByMe: Record<string, boolean> = {};
      if (commentIds.length) {
        const { data: likesData } = await supabase
          .from("comment_likes")
          .select("comment_id, user_id")
          .in("comment_id", commentIds);
        (likesData ?? []).forEach((l) => {
          const k = String(l.comment_id);
          likeCount[k] = (likeCount[k] ?? 0) + 1;
          if (user && l.user_id === user.id) likedByMe[k] = true;
        });
      }
      if (cancelled) return;

      setComments(
        rows.map((c) => {
          const p = c.user_id ? profileMap[String(c.user_id)] : undefined;
          return {
            id: String(c.id),
            user_id: c.user_id ? String(c.user_id) : null,
            username: p?.username ?? "Reader",
            avatar_url: p?.avatar_url ?? null,
            text: c.content ?? c.text ?? "",
            created_at: c.created_at ?? new Date().toISOString(),
            parent_id: c.parent_id ? String(c.parent_id) : null,
            likes: likeCount[String(c.id)] ?? 0,
            liked: !!likedByMe[String(c.id)],
          };
        })
      );
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, showToast]);

  /* ------------------------------ Follow ------------------------------ */
  const handleFollowToggle = async () => {
    if (followBusy) return;
    if (!meId) return showToast("Please log in to follow authors.");
    if (!story?.author_id) return;
    if (story.author_id === meId) return;

    setFollowBusy(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing); // turant dikhao

    const { error } = wasFollowing
      ? await supabase.from("follows").delete().eq("follower_id", meId).eq("following_id", story.author_id)
      : await supabase.from("follows").insert({ follower_id: meId, following_id: story.author_id });

    if (error) {
      setFollowing(wasFollowing);
      showToast("Something went wrong: " + error.message);
    } else {
      showToast(wasFollowing ? "Unfollowed" : "You're now following this author");
    }
    setFollowBusy(false);
  };

  /* ------------------------------ Story like ------------------------------ */
  const handleStoryLike = async () => {
    if (!meId) return showToast("Please log in to like.");
    if (!id) return;
    const wasLiked = storyLiked;
    setStoryLiked(!wasLiked);
    setRealLikes((n) => Math.max(0, n + (wasLiked ? -1 : 1)));

    const { error } = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", meId)
      : await supabase.from("post_likes").insert({ post_id: id, user_id: meId });

    if (error) {
      setStoryLiked(wasLiked);
      setRealLikes((n) => Math.max(0, n + (wasLiked ? 1 : -1)));
      showToast("Couldn't save your like: " + error.message);
    }
  };

  /* ------------------------------ Comment like ------------------------------ */
  const handleCommentLike = async (c: CommentItem) => {
    if (!meId) return showToast("Please log in to like.");
    const wasLiked = c.liked;
    const patch = (liked: boolean, delta: number) =>
      setComments((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, liked, likes: Math.max(0, x.likes + delta) } : x))
      );
    patch(!wasLiked, wasLiked ? -1 : 1);

    const { error } = wasLiked
      ? await supabase.from("comment_likes").delete().eq("comment_id", c.id).eq("user_id", meId)
      : await supabase.from("comment_likes").insert({ comment_id: c.id, user_id: meId });

    if (error) {
      patch(wasLiked, wasLiked ? 1 : -1);
      showToast("Couldn't save your like: " + error.message);
    }
  };

  /* ------------------------------ Comment tree ------------------------------ */
  const commentTree = useMemo(() => {
    const main = comments
      .filter((c) => !c.parent_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const replies = comments
      .filter((c) => c.parent_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return main.map((m) => ({ ...m, replies: replies.filter((r) => r.parent_id === m.id) }));
  }, [comments]);

  const liveList = useMemo(
    () => commentTree.slice(0, 6).map((c) => ({ username: c.username, text: c.text, avatar_url: c.avatar_url })),
    [commentTree]
  );

  useEffect(() => {
    if (liveList.length < 2) return;
    const t = setInterval(() => setLiveIndex((i) => (i + 1) % liveList.length), 4000);
    return () => clearInterval(t);
  }, [liveList.length]);

  const liveComment = liveList.length > 0 ? liveList[liveIndex % liveList.length] : null;

  /* ------------------------------ Post comment / reply ------------------------------ */
  const startReply = (c: CommentItem) => {
    setReplyTarget({ rootId: c.parent_id ?? c.id, username: c.username, mention: !!c.parent_id });
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handlePost = async () => {
    const raw = newComment.trim();
    if (!raw || !id || posting) return;
    if (!meId) return showToast("Please log in to comment.");

    const text = replyTarget?.mention ? `@${replyTarget.username} ${raw}` : raw;
    setPosting(true);

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: id,
          content: text,
          parent_id: replyTarget ? replyTarget.rootId : null,
          user_id: meId,
        })
        .select()
        .single();

      if (error) {
        showToast("Couldn't post your comment: " + error.message);
        return;
      }

      let username = "You";
      let avatar: string | null = null;
      const { data: prof } = await supabase.from("profiles").select("username, avatar_url").eq("id", meId).maybeSingle();
      if (prof) {
        username = prof.username || "You";
        avatar = prof.avatar_url || null;
      }

      const created: CommentItem = {
        id: String(data?.id ?? `local-${Date.now()}`),
        user_id: meId,
        username,
        avatar_url: avatar,
        text,
        created_at: data?.created_at ?? new Date().toISOString(),
        parent_id: replyTarget ? replyTarget.rootId : null,
        likes: 0,
        liked: false,
      };

      setComments((prev) => [...prev, created]);
      setNewComment("");
      setReplyTarget(null);
    } catch (err) {
      showToast("Error: " + errMsg(err));
    } finally {
      setPosting(false);
    }
  };

  /* ------------------------------ Share / profile / report ------------------------------ */
  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = story?.title ? `Read "${story.title}" on Losboi` : "Story on Losboi";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: title, url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showToast("Link copied");
      }
    } catch {
      /* user ne share cancel kiya */
    }
  };

  const handleViewProfile = () => {
    setMenuOpen(false);
    if (story?.author_id) router.push(`/profile?id=${story.author_id}`);
  };

  /* ------------------------------ Early returns ------------------------------ */
  if (!id) return <div className="min-h-screen bg-gray-50" />;
  if (loading)
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-rose-500 animate-spin" />
      </div>
    );
  if (notFound || !story)
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-gray-700">This story could not be found.</p>
        <button onClick={() => router.replace("/")} className="px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm">
          Go to home
        </button>
      </div>
    );

  // Marketing: views aur likes ka base fake, upar se asli likes jodte hain
  const fakeViews = getFakeViewsNumber(story.reads || 0);
  const displayViews = formatNumber(fakeViews);
  const fakeLikesBase = fakeViews === 0 ? 0 : Math.floor(fakeViews * 0.08);
  const displayLikes = formatNumber(fakeLikesBase + realLikes);

  const sheetBg = dark ? "bg-[#1a1a1a] text-white" : "bg-white text-gray-900";
  const sheetBorder = dark ? "border-[#333]" : "border-gray-100";
  const isOwnStory = !!meId && story.author_id === meId;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? "bg-[#121212]" : "bg-gray-50"}`}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>

      <div
        className={`max-w-md mx-auto min-h-screen relative transition-[filter,background-color] duration-300 ${
          anySheetOpen ? "blur-sm" : ""
        } ${dark ? "bg-[#121212]" : "bg-white"}`}
      >
        {/* Thumbnail */}
        <div className="relative w-full aspect-video bg-gray-100 border-b border-gray-100">
          {story.thumbnail_url ? (
            <img src={story.thumbnail_url} alt={story.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-700 to-rose-900" />
          )}
          <button
            onClick={() => router.back()}
            className="absolute top-3 left-3 h-10 w-10 rounded-full bg-black/45 backdrop-blur-md text-white text-xl flex items-center justify-center active:scale-95 z-20"
          >
            ←
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="absolute top-3 right-3 h-10 w-10 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center active:scale-95 z-20 transition"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Author header */}
        <header
          className={`sticky top-0 z-40 backdrop-blur-md transition-transform duration-300 ease-in-out ${
            zenMode ? "-translate-y-full" : "translate-y-0"
          } ${dark ? "bg-[#1a1a1a]/95 border-b border-[#333]" : "bg-white/95 border-b border-gray-100"}`}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={handleViewProfile} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <Avatar src={story.avatar_url} name={story.username || "?"} size={40} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${dark ? "text-gray-100" : "text-gray-900"}`}>{story.username}</p>
                <p className={`text-xs truncate ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  {displayViews} views{story.category ? ` • ${story.category}` : ""}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-2.5">
              {!isOwnStory && (
                <button
                  onClick={handleFollowToggle}
                  disabled={followBusy}
                  className={`h-9 px-5 rounded-full text-sm font-semibold active:scale-95 transition shadow-sm ${
                    following
                      ? dark
                        ? "bg-[#333] text-gray-200"
                        : "bg-gray-100 text-gray-800 border border-gray-200"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {following ? "Following" : "Follow"}
                </button>
              )}
              <button
                onClick={() => setMenuOpen(true)}
                className={`h-9 w-9 rounded-full flex items-center justify-center text-xl transition-colors ${
                  dark ? "text-gray-300 hover:bg-[#333]" : "text-gray-700 active:bg-gray-100"
                }`}
              >
                ⋮
              </button>
            </div>
          </div>
        </header>

        {/* Story */}
        <main onClick={() => setZenMode((z) => !z)} className="px-5 pt-6 pb-36 cursor-pointer">
          {story.title && (
            <h1 className={`font-serif text-3xl font-bold leading-tight mb-4 break-words transition-colors ${dark ? "text-gray-100" : "text-gray-900"}`}>
              {story.title}
            </h1>
          )}

          <div
            className={`flex items-center gap-6 mb-8 pb-4 border-b cursor-default transition-colors ${dark ? "border-[#333]" : "border-gray-100"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center gap-1.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              <Eye size={18} />
              <span className="text-sm font-semibold">{displayViews} Views</span>
            </div>
            <button
              onClick={handleStoryLike}
              className={`flex items-center gap-1.5 transition-colors active:scale-95 ${
                storyLiked ? "text-rose-600" : dark ? "text-gray-400 hover:text-rose-500" : "text-gray-500 hover:text-rose-600"
              }`}
            >
              <Heart size={18} fill={storyLiked ? "currentColor" : "none"} />
              <span className="text-sm font-semibold">{displayLikes} Likes</span>
            </button>
            <button
              onClick={() => setCommentSheetOpen(true)}
              className={`flex items-center gap-1.5 transition-colors active:scale-95 ${dark ? "text-gray-400" : "text-gray-500"}`}
            >
              <MessageCircle size={18} />
              <span className="text-sm font-semibold">{comments.length}</span>
            </button>
            <button
              onClick={handleShare}
              className={`ml-auto flex items-center gap-1.5 transition-colors ${dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-800"}`}
            >
              <Share2 size={18} />
            </button>
          </div>

          <div className={`font-serif text-[18px] leading-[1.8] whitespace-pre-wrap break-words transition-colors ${dark ? "text-gray-300" : "text-gray-800"}`}>
            {story.content}
          </div>
        </main>
      </div>

      {/* Floating comment bar: hamesha dikhta hai, comment na ho tab bhi */}
      <button
        onClick={() => setCommentSheetOpen(true)}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] z-30 rounded-full shadow-lg border px-3 py-2.5 flex items-center gap-3 text-left transition-all duration-300 ease-in-out ${
          zenMode ? "translate-y-[150%]" : "translate-y-0"
        } ${dark ? "bg-[#222] border-[#333]" : "bg-white border-gray-200"}`}
      >
        {liveComment ? (
          <>
            <Avatar src={liveComment.avatar_url} name={liveComment.username} size={28} />
            <div key={liveIndex} className="flex-1 min-w-0" style={{ animation: "fadeIn 0.4s ease" }}>
              <p className="text-[13px] leading-tight truncate">
                <span className={`font-semibold ${dark ? "text-gray-200" : "text-gray-900"}`}>{liveComment.username}</span>
                <span className={`ml-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>{liveComment.text}</span>
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="h-7 w-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <MessageCircle size={15} />
            </div>
            <p className={`text-[13px] flex-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>Add a comment...</p>
          </>
        )}
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] max-w-[90%] px-4 py-2.5 rounded-full bg-gray-900/95 text-white text-sm shadow-lg text-center">
          {toast}
        </div>
      )}

      {/* COMMENT SHEET */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${commentSheetOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!commentSheetOpen}
      >
        <div
          onClick={() => {
            setCommentSheetOpen(false);
            setReplyTarget(null);
          }}
          className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        />
        <div
          className={`absolute bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 h-[80vh] flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
            commentSheetOpen ? "translate-y-0" : "translate-y-full"
          } ${sheetBg}`}
          style={{ borderRadius: "24px 24px 0 0" }}
        >
          <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b ${sheetBorder}`}>
            <h2 className="text-base font-semibold">Comments ({comments.length})</h2>
            <button
              onClick={() => {
                setCommentSheetOpen(false);
                setReplyTarget(null);
              }}
              className="h-8 w-8 rounded-full flex items-center justify-center text-lg"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-6">
            {commentTree.length === 0 ? (
              <p className="text-center text-sm pt-10 text-gray-400">No comments yet. Be the first to comment.</p>
            ) : (
              commentTree.map((c) => (
                <div key={c.id} className="flex flex-col gap-3">
                  <CommentRow c={c} dark={dark} onLike={handleCommentLike} onReply={startReply} />
                  {c.replies.length > 0 && (
                    <div className={`ml-[18px] pl-5 border-l-2 space-y-4 ${dark ? "border-[#333]" : "border-gray-100"}`}>
                      {c.replies.map((r) => (
                        <CommentRow key={r.id} c={r} dark={dark} isReply onLike={handleCommentLike} onReply={startReply} />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className={`p-4 border-t ${dark ? "border-[#333] bg-[#222]" : "border-gray-100 bg-white"}`}>
            {replyTarget && (
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs text-gray-400">
                  Replying to <span className="font-semibold">{replyTarget.username}</span>
                </span>
                <button onClick={() => setReplyTarget(null)} className="text-xs font-semibold text-rose-500">
                  Cancel
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handlePost();
                  }
                }}
                placeholder={replyTarget ? "Add a reply..." : "Add a comment..."}
                className={`flex-1 px-4 py-2.5 rounded-full text-sm border outline-none ${
                  dark ? "bg-[#121212] border-[#444] text-white" : "bg-gray-100 border-transparent text-gray-900"
                }`}
              />
              <button
                onClick={handlePost}
                disabled={posting || !newComment.trim()}
                className="px-5 py-2.5 rounded-full bg-rose-600 text-white text-sm font-semibold active:scale-95 transition disabled:opacity-50"
              >
                {posting ? "..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3-DOTS MENU SHEET */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!menuOpen}
      >
        <div onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div
          className={`absolute bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 shadow-2xl px-4 pt-3 pb-8 transition-transform duration-300 ${
            menuOpen ? "translate-y-0" : "translate-y-full"
          } ${sheetBg}`}
          style={{ borderRadius: "24px 24px 0 0" }}
        >
          <div className={`mx-auto mb-3 h-1.5 w-10 rounded-full ${dark ? "bg-[#444]" : "bg-gray-300"}`} />
          <div className="flex flex-col space-y-1">
            <button
              onClick={handleViewProfile}
              className={`w-full text-left px-3 py-3 rounded-xl text-[15px] font-semibold ${dark ? "text-gray-100 active:bg-[#2a2a2a]" : "text-gray-900 active:bg-gray-100"}`}
            >
              View Author Profile
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                setReportSheetOpen(true);
              }}
              className={`w-full text-left px-3 py-3 rounded-xl text-[15px] font-semibold text-rose-600 flex items-center gap-2 ${dark ? "active:bg-[#2a2a2a]" : "active:bg-gray-100"}`}
            >
              <Flag size={18} /> Report Story
            </button>
          </div>
        </div>
      </div>

      {/* REPORT SHEET (separate component: components/report) */}
      <ReportSheet
        open={reportSheetOpen}
        onClose={() => setReportSheetOpen(false)}
        postId={story.id}
        userId={meId}
        dark={dark}
        onToast={showToast}
      />
    </div>
  );
}
