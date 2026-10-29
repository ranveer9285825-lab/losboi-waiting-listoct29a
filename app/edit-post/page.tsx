"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, ImageIcon, Loader2, Save } from "lucide-react";

function EditPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [category, setCategory] = useState("Mystery");
  
  const [uploadingCover, setUploadingCover] = useState(false);
  const categories = ["Mystery", "Romance", "Horror", "Sci-Fi", "Drama", "General"];

  useEffect(() => {
    async function fetchPost() {
      if (!postId) { router.push("/profile"); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push("/auth"); return; }
      setUser(session.user);

      const { data, error } = await supabase.from('posts').select('*').eq('id', postId).single();
      if (data && data.author_id === session.user.id) {
        setTitle(data.title || "");
        setContent(data.content || "");
        setCoverUrl(data.thumbnail_url || "");
        setCategory(data.category || "Mystery");
      } else {
        alert("Aap is post ko edit nahi kar sakte.");
        router.push("/profile");
      }
      setLoading(false);
    }
    fetchPost();
  }, [postId, router]);

  const uploadCoverImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      setUploadingCover(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `posts/${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('uploads').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);
      setCoverUrl(publicUrl);
    } catch (error: any) {
      alert("Image upload fail: " + error.message);
    } finally { setUploadingCover(false); }
  };

  const handleUpdate = async () => {
    if (!title.trim() || !content.trim()) { alert("Title aur kahani dono likhna zaroori hai!"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('posts').update({
          title: title.trim(), content: content.trim(), thumbnail_url: coverUrl.trim() || null, category: category
      }).eq('id', postId);
      if (error) throw error;
      router.push(`/read?id=${postId}`);
    } catch (error: any) {
      alert("Update nahi ho paya: " + error.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-gray-500" size={32} /></div>;

  return (
    <div className="min-h-screen bg-white font-sans pb-20">
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition text-gray-700"><ArrowLeft size={22} /></button>
          <div className="text-sm font-semibold text-gray-900">Edit Story</div>
          <button onClick={handleUpdate} disabled={saving || !title.trim() || !content.trim()} className="flex items-center gap-1.5 text-sm font-bold bg-blue-600 text-white px-4 py-1.5 rounded-full hover:bg-blue-700 transition active:scale-95 disabled:opacity-40">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={14} />} {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <main className="px-5 pt-6 max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-700 py-1.5 px-3 rounded-lg outline-none focus:border-black">
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
        </div>

        <div className="relative w-full h-40 bg-gray-50 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 flex flex-col items-center justify-center group transition-colors hover:bg-gray-100">
            {coverUrl ? <img src={coverUrl} alt="Cover preview" className="w-full h-full object-cover" /> : <div className="text-gray-400 flex flex-col items-center pointer-events-none"><ImageIcon size={32} className="mb-2 text-gray-400" /><span className="text-sm font-bold text-gray-600">Tap to update thumbnail</span><span className="text-xs text-gray-400 mt-1">Select from gallery</span></div>}
            <input type="file" accept="image/*" onChange={uploadCoverImage} disabled={uploadingCover} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            {uploadingCover && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center"><Loader2 size={24} className="animate-spin text-black" /></div>}
        </div>

        <div>
          <textarea value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kahani ka Title..." rows={2} className="w-full text-3xl font-bold font-serif text-gray-900 placeholder-gray-300 outline-none resize-none leading-tight" />
        </div>
        <div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Apni kahani yahan se likhna shuru karein..." className="w-full min-h-[50vh] text-[17px] leading-[1.8] font-serif text-gray-800 placeholder-gray-300 outline-none resize-none" />
        </div>
      </main>
    </div>
  );
}

export default function EditPostPage() {
  return <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-gray-500" size={32} /></div>}><EditPostContent /></Suspense>;
}
