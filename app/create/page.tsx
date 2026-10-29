"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, ImageIcon, Loader2, Send } from "lucide-react";

export default function CreatePostPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [category, setCategory] = useState("Mystery");
  
  const [uploadingCover, setUploadingCover] = useState(false);

  const categories = ["Mystery", "Romance", "Horror", "Sci-Fi", "Drama", "General"];

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) router.push("/auth");
      else setUser(session.user);
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  // Gallery se photo upload karne ka logic
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
    } finally {
      setUploadingCover(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Title aur kahani dono likhna zaroori hai!");
      return;
    }
    setPublishing(true);

    try {
      const { data, error } = await supabase.from('posts').insert({
          author_id: user.id,
          title: title.trim(),
          content: content.trim(),
          thumbnail_url: coverUrl.trim() || null,
          category: category,
          type: 'episode'
        }).select().single();

      if (error) throw error;
      router.push(`/read?id=${data.id}`);
      
    } catch (error: any) {
      alert("Publish nahi ho paya: " + error.message);
      setPublishing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-gray-500" size={32} /></div>;

  return (
    <div className="min-h-screen bg-white font-sans pb-20">
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition text-gray-700"><ArrowLeft size={22} /></button>
          <div className="text-sm font-semibold text-gray-400">New Story</div>
          <button onClick={handlePublish} disabled={publishing || !title.trim() || !content.trim()} className="flex items-center gap-1.5 text-sm font-bold bg-blue-600 text-white px-4 py-1.5 rounded-full hover:bg-blue-700 transition active:scale-95 disabled:opacity-40">
            {publishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />} {publishing ? "Publishing..." : "Publish"}
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

        {/* Gallery Upload Dabba */}
        <div className="relative w-full h-40 bg-gray-50 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 flex flex-col items-center justify-center group transition-colors hover:bg-gray-100">
            {coverUrl ? (
                <img src={coverUrl} alt="Cover preview" className="w-full h-full object-cover" />
            ) : (
                <div className="text-gray-400 flex flex-col items-center pointer-events-none">
                    <ImageIcon size={32} className="mb-2 text-gray-400" />
                    <span className="text-sm font-bold text-gray-600">Tap to upload thumbnail</span>
                    <span className="text-xs text-gray-400 mt-1">Select from gallery</span>
                </div>
            )}
            
            {/* Hidden File Input */}
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
